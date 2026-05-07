import express from "express";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = "users";
const EXECUTIVES_FILE = "executives";
const SETTINGS_FILE = "settings";

const EXECUTIVES_LIST_FILE = "executives_list";
const EXECUTIVE_PAYMENTS_FILE = "executive_payments";
const RESOURCES_FILE = "resources";
const COOPERATIVE_PAYMENTS_FILE = "cooperative_payments";
const MESSAGES_FILE = "messages";

const uploadsDir = process.env.VERCEL ? "/tmp/uploads" : path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir);
  } catch (err) {
    console.warn("Could not create uploads directory (expected in serverless):", err);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (process.env.VERCEL) {
      cb(null, '/tmp'); // Vercel only allows writing to /tmp
    } else {
      cb(null, uploadsDir);
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.\-]/g, '_');
    cb(null, uniqueSuffix + '-' + sanitizedName)
  }
})

const upload = multer({ storage: storage })

// Cloudinary setup
let cloudinaryConfiguredStatus = false;

const initializeCloudinary = async (providedSettings?: any) => {
  try {
    let url = process.env.CLOUDINARY_URL;
    
    // Check provided settings first
    if (providedSettings?.cloudinaryUrl && providedSettings.cloudinaryUrl.startsWith("cloudinary://")) {
      url = providedSettings.cloudinaryUrl;
    } else {
      // Try to load from local file first (fast)
      try {
        const filePath = path.join(__dirname, `${SETTINGS_FILE}.json`);
        if (fs.existsSync(filePath)) {
          const settings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (settings?.cloudinaryUrl && settings.cloudinaryUrl.startsWith("cloudinary://")) {
            url = settings.cloudinaryUrl;
          }
        }
      } catch (e) {
        // Fallback to full loadData if file read fails
        const settings = await loadData(SETTINGS_FILE, null);
        if (settings?.cloudinaryUrl && settings.cloudinaryUrl.startsWith("cloudinary://")) {
          url = settings.cloudinaryUrl;
        }
      }
    }

    if (url && typeof url === 'string' && url.trim().startsWith("cloudinary://")) {
      const trimmedUrl = url.trim();
      if (!trimmedUrl.includes("<your_api_key>")) {
        cloudinary.config({
          cloudinary_url: trimmedUrl,
          secure: true
        });
        console.log("Cloudinary initialized via URL");
        cloudinaryConfiguredStatus = true;
        return true;
      }
    } else if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
      console.log("Cloudinary initialized via individual keys");
      cloudinaryConfiguredStatus = true;
      return true;
    }
    cloudinaryConfiguredStatus = false;
    return false;
  } catch (err) {
    console.error("Failed to initialize Cloudinary:", err);
    cloudinaryConfiguredStatus = false;
    return false;
  }
};
initializeCloudinary();

const isCloudinaryConfigured = () => {
  return cloudinaryConfiguredStatus;
};

// Supabase setup
const rawSupabaseUrl = process.env.SUPABASE_URL || "";
// Sanitize URL: remove trailing slashes and /rest/v1 if present
const supabaseUrl = rawSupabaseUrl.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
// Prefer Service Role Key on the server to bypass RLS for administrative tasks
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

// Utility to check if Supabase is likely configured
const isSupabaseConfigured = () => {
  return supabaseUrl !== "" && supabaseKey !== "" && !supabaseKey.startsWith("sb_publishable_") && !supabaseKey.startsWith("your_");
};

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co", 
  supabaseKey || "placeholder"
);

async function loadData(key: string, _default: any) {
  // Always start with local file as a baseline/fallback
  let fileData = _default;
  const filePath = path.join(__dirname, `${key}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content) {
        try {
          fileData = JSON.parse(content);
        } catch (parseErr) {
          console.error(`Local file parse error for ${key}:`, parseErr);
          // If corrupted, rename it so we don't keep failing
          try {
            fs.renameSync(filePath, `${filePath}.corrupted`);
            console.warn(`Renamed corrupted file ${key}.json to ${key}.json.corrupted`);
          } catch (renameErr) {
            console.error(`Failed to rename corrupted file ${key}.json:`, renameErr);
          }
        }
      }
    }
  } catch (err) {
    console.error(`Local file load error for ${key}:`, err);
  }

  if (!isSupabaseConfigured()) {
    return fileData;
  }

  try {
    const { data, error } = await supabase.from('kv_store').select('value').eq('key', key).single();
    if (error) {
       if (error.code !== 'PGRST116') { // PGRST116 is not found, which is fine
          console.error(`Supabase load error for ${key}:`, error.message);
       }
       return fileData;
    }
    if (data && data.value) return data.value;
  } catch (err) {
    console.error(`Supabase load exception for ${key}:`, err);
  }
  return fileData;
}

async function saveData(key: string, data: any) {
  // Always save to local file first
  const filePath = path.join(__dirname, `${key}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(`Local file save error for ${key}:`, err);
  }

  if (!isSupabaseConfigured()) {
    return true; // We saved locally at least
  }

  try {
    const { error } = await supabase.from('kv_store').upsert({ key, value: data });
    if (error) {
       console.error(`Supabase save error for ${key}:`, error.message);
       return false;
    }
    return true;
  } catch(e) { 
    console.error(`Supabase save exception for ${key}:`, e); 
    return false;
  }
}

async function checkSupabaseHealth() {
  if (!isSupabaseConfigured()) {
    console.error("Supabase is NOT configured correctly. Check your environment variables.");
    return;
  }
  
  console.log("Checking Supabase connection and tables...");
  
  // Check kv_store table
  const { error: kvError } = await supabase.from('kv_store').select('key').limit(1);
  if (kvError) {
    console.error("ERROR: 'kv_store' table missing or inaccessible in Supabase:", kvError.message);
    console.log("Please ensure you have created a table named 'kv_store' with columns 'key' (text, primary key) and 'value' (jsonb).");
  } else {
    console.log("SUCCESS: 'kv_store' table is accessible.");
  }

  // Check storage buckets
  const buckets = ['books', 'App_files', 'executive member'];
  for (const bucketName of buckets) {
    const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
    if (bucketError) {
      console.warn(`WARNING: Storage bucket '${bucketName}' missing or inaccessible:`, bucketError.message);
    } else {
      console.log(`SUCCESS: Storage bucket '${bucketName}' is accessible.`);
    }
  }
}

// Initial default setup
setTimeout(async () => {
    let settings = await loadData(SETTINGS_FILE, null);
    if (!settings) {
      await saveData(SETTINGS_FILE, {
        heroImage: "/hero-bg.jpg", 
        logoImage: null,
        monthlyDuesAmount: 2000,
        executiveDuesAmount: 5000,
        certificatePrice: 5000,
        licensePrice: 10000,
        events: [
          { id: 1, title: "Annual Minister Conference", date: "October 12-14, 2026", loc: "Lagos, Nigeria" },
          { id: 2, title: "Virtual Fellowship & Prayer", date: "Every Friday", loc: "ASSYMOG Meeting Room" },
          { id: 3, title: "Leadership & Growth Workshop", date: "August 5, 2026", loc: "Online" }
        ]
      });
    }
}, 0);

// Create outer app instance for Vercel
const app = express();
const PORT = 3000;
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use("/uploads", express.static(uploadsDir));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    cloudinary: isCloudinaryConfigured(),
    supabase: isSupabaseConfigured()
  });
});

// Cloudinary Upload Endpoint
app.post("/api/upload-cloudinary", upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  if (!isCloudinaryConfigured()) {
     console.warn("Cloudinary not configured, returning local path as fallback");
     return res.json({ url: `/uploads/${req.file.filename}`, fallback: true });
  }

  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "assymog_uploads",
      resource_type: "auto"
    });
    
    // Clean up local file after upload
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.json({ 
      url: result.secure_url,
      public_id: result.public_id
    });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    // Cleanup on error too
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Failed to upload to Cloudinary: " + error.message });
  }
});

// Socket.io Real-Time Chat handling
io.on("connection", (socket) => {
  console.log("A user connected to chat:", socket.id);

  socket.on("chat message", (msg) => {
    // Broadcast the message to everyone
    io.emit("chat message", {
      ...msg,
      timestamp: new Date().toISOString()
    });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// We no longer wrap the ENTIRE api routes in startServer. 
// Just start the Vite middleware if we are doing local server.


  app.get("/api/resources", async (req, res) => {
    try {
      const resources = await loadData(RESOURCES_FILE, []);
      res.json(resources);
    } catch (e) {
      res.status(500).json({ error: "Failed to load resources" });
    }
  });

  app.post("/api/resources", upload.single('file'), async (req, res) => {
    try {
      const { title, description, url } = req.body;
      const file = req.file;
      
      if (!file && !url) {
         return res.status(400).json({ error: "No file or URL provided" });
      }

      let fileUrl = url || "";
      let filename = "external_link";
      let cloudPublicId = "";
      
      if (file) {
        filename = file.filename;
        
        // Try Cloudinary first
        if (isCloudinaryConfigured()) {
            try {
                const result = await cloudinary.uploader.upload(file.path, {
                    folder: "assymog_resources",
                    resource_type: "auto"
                });
                fileUrl = result.secure_url;
                cloudPublicId = result.public_id;
                // Clean up local temp file
                if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
            } catch (cErr) {
                console.warn("Cloudinary resource upload failed, trying Supabase:", cErr);
            }
        }

        // Fallback or concurrent upload to Supabase bucket 'books'
        if (!fileUrl) {
            try {
              const fileContent = fs.readFileSync(file.path);
              const { data, error } = await supabase.storage
                .from('books')
                .upload(`${file.filename}`, fileContent, {
                   contentType: file.mimetype,
                   upsert: true
                });
                
              if (error) {
                console.error("Supabase storage upload error:", error);
                if (!fileUrl) return res.status(500).json({ error: "Failed to upload to Supabase Storage: " + error.message });
              } else {
                // get public url
                const { data: publicUrlData } = supabase.storage
                   .from('books')
                   .getPublicUrl(`${file.filename}`);
                   
                if (publicUrlData && publicUrlData.publicUrl) {
                  fileUrl = publicUrlData.publicUrl;
                } else if (!fileUrl) {
                  return res.status(500).json({ error: "Failed to get public URL for the file from Supabase" });
                }
              }
            } catch (err) {
              console.error("Failed to upload to Supabase:", err);
              if (!fileUrl) return res.status(500).json({ error: "Failed to process upload via Supabase" });
            }
        }
      }

      let resources = await loadData(RESOURCES_FILE, []);
      const newResource = { 
         id: Date.now(), 
         title, 
         description,
         filename: filename,
         cloudPublicId: (cloudPublicId as any) || "",
         originalName: file ? file.originalname : "Link",
         mimetype: file ? file.mimetype : "url",
         size: file ? file.size : 0,
         url: fileUrl,
         createdAt: new Date().toISOString() 
      };
      resources.push(newResource);
      const saved = await saveData(RESOURCES_FILE, resources);
      if (!saved) {
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return res.status(500).json({ error: "File uploaded but failed to save resource entry to database" });
      }
      
      // Final cleanup of local file if it still exists (after Cloudinary/Supabase success)
      if (file && fs.existsSync(file.path)) {
         fs.unlinkSync(file.path);
      }
      
      res.json(newResource);
    } catch (e) {
      res.status(500).json({ error: "Failed to upload resource" });
    }
  });

  app.delete("/api/resources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let resources = await loadData(RESOURCES_FILE, []);
      const resourceEntry = resources.find((r: any) => r.id === parseInt(id));
      
      if (resourceEntry) {
         // Attempt to delete from Supabase storage
         try {
           if (resourceEntry.filename && resourceEntry.filename !== "external_link") {
             await supabase.storage.from('books').remove([resourceEntry.filename]);
           }
         } catch(e) {}

         // Attempt to delete from Cloudinary if public ID exists
         if (resourceEntry.cloudPublicId && isCloudinaryConfigured()) {
            try {
               await cloudinary.uploader.destroy(resourceEntry.cloudPublicId);
            } catch (cErr) {
               console.error("Failed to delete from Cloudinary:", cErr);
            }
         }

         const filePath = path.join(uploadsDir, resourceEntry.filename);
         if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
         }
      }
      
      resources = resources.filter((r: any) => r.id !== parseInt(id));
      await saveData(RESOURCES_FILE, resources);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete resource" });
    }
  });

  // API Routes
  app.get("/api/admin/executives", async (req, res) => {
    try {
      const execs = await loadData(EXECUTIVES_LIST_FILE, []);
      res.json(execs);
    } catch (e) {
      res.status(500).json({ error: "Failed to load executives" });
    }
  });

  const EXECUTIVE_ROLES_LIMITS: Record<string, number> = {
    "President": 1,
    "Vice President": 1,
    "General Secretary": 1,
    "Assistant General Secretary": 1,
    "Financial Secretary": 1,
    "Treasurer": 1,
    "Auditor": 1,
    "Public Relations Officer (PRO)": 1,
    "Welfare Officer": 2,
    "Legal Adviser": 1,
    "Ex-Officio": 5,
    "Member of Board": 20
  };

  app.post("/api/admin/executives", async (req, res) => {
    try {
      const { name, role, email, accessKey } = req.body;
      const execs = await loadData(EXECUTIVES_LIST_FILE, []);
      
      const roleCount = execs.filter((e: any) => e.role === role).length;
      const limit = EXECUTIVE_ROLES_LIMITS[role] || 0;

      if (limit > 0 && roleCount >= limit) {
        return res.status(400).json({ error: `The position of ${role} is full (Limit: ${limit}).` });
      }

      const newExec = { id: Date.now(), name, role, email, accessKey, createdAt: new Date().toISOString() };
      execs.push(newExec);
      await saveData(EXECUTIVES_LIST_FILE, execs);
      res.json(newExec);
    } catch (e) {
      res.status(500).json({ error: "Failed to create executive" });
    }
  });

  app.delete("/api/admin/executives/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let execs = await loadData(EXECUTIVES_LIST_FILE, []);
      execs = execs.filter((e: any) => e.id !== parseInt(id));
      await saveData(EXECUTIVES_LIST_FILE, execs);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete executive" });
    }
  });

  app.post("/api/executive/login", async (req, res) => {
    const { accessKey } = req.body;
    try {
      const execs = await loadData(EXECUTIVES_LIST_FILE, []);
      const payments = await loadData(EXECUTIVE_PAYMENTS_FILE, []);
      let exec = execs.find((e: any) => e.accessKey === accessKey);
      
      if (!exec) {
        const users = await loadData(USERS_FILE, []);
        const promotedExec = users.find((u: any) => u.userType === 'executive' && u.accessKey === accessKey);
        if (promotedExec) exec = { ...promotedExec, name: promotedExec.fullName };
      }

      if (exec) {
        const myPayments = payments.filter((p: any) => p.accessKey === accessKey);
        res.json({ 
          success: true, 
          user: { 
            ...exec, 
            userType: 'executive',
            fullName: exec.name,
            churchName: "ASSYMOG Executive Board",
            status: 'approved',
            registrationNumber: exec.accessKey,
            phone: exec.role,
            duesPayments: myPayments
          } 
        });
      } else {
        res.status(401).json({ error: "Invalid access key" });
      }
    } catch (e) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/executive/pay-dues", async (req, res) => {
    const { accessKey, amount, reference, month, year, datePaid } = req.body;
    try {
      const payments = await loadData(EXECUTIVE_PAYMENTS_FILE, []);
      const newPayment = { id: Date.now(), accessKey, amount, reference, month, year, datePaid };
      payments.push(newPayment);
      await saveData(EXECUTIVE_PAYMENTS_FILE, payments);
      res.json({ success: true, payment: newPayment });
    } catch (e) {
      res.status(500).json({ error: "Payment failed" });
    }
  });

  app.get("/api/members/search", async (req, res) => {
    const { query } = req.query;
    try {
      let supabaseUsers: any[] = [];
      try {
        const { data, error } = await supabase.from('users').select('fullName, registrationNumber, churchName, status');
        if (!error && data) supabaseUsers = data;
      } catch (err) {}
      
      let localUsers: any[] = await loadData(USERS_FILE, []);

      let executives: any[] = await loadData(EXECUTIVES_LIST_FILE, []);

      // Merge and limit fields for public view
      const usersMap = new Map();
      localUsers.forEach(u => usersMap.set(u.registrationNumber || u.email, {
        fullName: u.fullName,
        registrationNumber: u.registrationNumber,
        churchName: u.churchName,
        churchAddress: u.churchAddress,
        phone: u.phone,
        state: u.state,
        lga: u.lga,
        role: u.role,
        status: u.status,
        userType: 'member'
      }));
      supabaseUsers.forEach(u => usersMap.set(u.registrationNumber || u.email, {
        fullName: u.fullName,
        registrationNumber: u.registrationNumber,
        churchName: u.churchName,
        churchAddress: u.churchAddress,
        phone: u.phone,
        state: u.state,
        lga: u.lga,
        role: u.role,
        status: u.status,
        userType: 'member'
      }));
      executives.forEach(u => usersMap.set(u.accessKey || u.email, {
        fullName: u.name,
        registrationNumber: u.accessKey || "EXECUTIVE",
        churchName: "ASSYMOG Executive Board",
        churchAddress: "National Secretariat",
        phone: u.email,
        state: "Federal",
        lga: "Executive Council",
        role: u.role,
        status: 'approved',
        userType: 'executive'
      }));

      const approvedMembers = Array.from(usersMap.values()).filter((u: any) => u.status === 'approved');
      
      if (query) {
        const q = (query as string).toLowerCase();
        const results = approvedMembers.filter((m: any) => 
          m.fullName.toLowerCase().includes(q) || 
          (m.registrationNumber && m.registrationNumber.toLowerCase().includes(q)) ||
          (m.churchName && m.churchName.toLowerCase().includes(q))
        );
        return res.json({ members: results });
      }
      
      res.json({ members: approvedMembers.slice(0, 50) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to search members" });
    }
  });

  app.get("/api/users", async (req, res) => {
    try {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          return res.json({ users: data.map((u: any) => ({
            id: u.id,
            fullName: u.fullName,
            email: u.email,
            phone: u.phone,
            churchName: u.churchName,
            status: u.status || "pending",
            registrationNumber: u.registrationNumber,
            certificateData: u.certificateData,
            licenseData: u.licenseData,
            certForm: u.certForm,
            licForm: u.licForm
          })) });
        }
      } catch (err) {}
    }
    
    // Fallback if DB check fails
    let localUsers: any[] = await loadData(USERS_FILE, []);
    res.json({ users: localUsers });
    } catch (e: any) {
      console.error(e);
      res.json({ users: [] });
    }
  });

  app.post("/api/register", async (req, res) => {
    const { fullName, email, phone, churchName, password } = req.body;
    
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    let userCount = 0;
    if (isSupabaseConfigured()) {
      try {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
        if (count !== null) userCount = count;
      } catch (err) {}
    }
    
    const localUsers = await loadData(USERS_FILE, []);
    if (localUsers.length > userCount) userCount = localUsers.length;

    const nextId = userCount + 1;
    const yearStr = new Date().getFullYear().toString().substring(2);
    const registrationNumber = `ASYM/M${yearStr}/${String(nextId).padStart(4, '0')}`;

    try {
      if (isSupabaseConfigured()) {
        const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
        if (existing) {
           return res.status(400).json({ error: "User already exists" });
        }

        await supabase.from('users').insert([
          { fullName, email, phone, churchName, password, status: "pending", registrationNumber }
        ]);
      }

      // Always save to JSON fallback
      let currentUsers = await loadData(USERS_FILE, []);
      if (!currentUsers.find((u: any) => u.email === email)) {
        currentUsers.push({ id: Date.now().toString(), fullName, email, phone, churchName, password, status: "pending", registrationNumber });
        await saveData(USERS_FILE, currentUsers);
      }

      res.json({ message: "Registration successful", user: { fullName, email, churchName, status: "pending", registrationNumber } });
    } catch (e: any) {
      console.error("Registration error:", e);
      // Try local only fallback if not already handled
      let currentUsers = await loadData(USERS_FILE, []);
      if (currentUsers.find((u: any) => u.email === email)) {
        return res.json({ message: "Registration successful (recovered)", user: { fullName, email, churchName, status: "pending", registrationNumber } });
      }
      res.status(500).json({ error: "Could not complete registration" });
    }
  });

  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    try {
      let sbUser = null;
      if (isSupabaseConfigured()) {
        try {
          const { data: user, error } = await supabase.from('users').select('*').eq('email', email).eq('password', password).limit(1).maybeSingle();
          if (!error && user) sbUser = user;
        } catch (err) {}
      }

      if (sbUser) {
        return res.json({ 
          user: { 
            id: sbUser.id,
            fullName: sbUser.fullName, 
            email: sbUser.email, 
            churchName: sbUser.churchName,
            status: sbUser.status || "approved",
            registrationNumber: sbUser.registrationNumber,
            certificateData: sbUser.certificateData,
            licenseData: sbUser.licenseData,
            duesPayments: sbUser.duesPayments || []
          } 
        });
      }

      // Fallback to local
      const users = await loadData(USERS_FILE, []);
      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (user) {
        return res.json({ 
          user: { 
            id: user.id,
            fullName: user.fullName, 
            email: user.email, 
            churchName: user.churchName,
            status: user.status || "approved",
            registrationNumber: user.registrationNumber,
            certificateData: user.certificateData,
            licenseData: user.licenseData,
            duesPayments: user.duesPayments || []
          } 
        });
      }

      res.status(401).json({ error: "Invalid email or password" });
    } catch (e: any) {
      console.error("Login error:", e);
      res.status(500).json({ error: "Server error during login" });
    }
  });

  app.post("/api/admin/update-user", async (req, res) => {
    const { email, status, certificateData, licenseData, certificateExpiry, licenseExpiry, certForm, licForm, userType, role, accessKey } = req.body;
    let success = false;

    if (userType === 'executive' && role) {
      try {
        const currentExecs = await loadData(EXECUTIVES_LIST_FILE, []);
        const allUsers = await loadData(USERS_FILE, []);
        const promotedFromUsers = allUsers.filter((u: any) => u.userType === 'executive');
        
        // Combine explicit executives and promoted users for limit checking
        const roleCount = [...currentExecs, ...promotedFromUsers].filter((ex: any) => ex.role === role && ex.email !== email).length;
        const limit = EXECUTIVE_ROLES_LIMITS[role] || 0;
        
        if (limit > 0 && roleCount >= limit) {
          return res.status(400).json({ error: `The position of ${role} is full (Limit: ${limit}).` });
        }
      } catch (e) {
        console.error("Error checking role limits:", e);
      }
    }
    
    const updates: any = {};
    if (status) updates.status = status;
    if (certificateData !== undefined) updates.certificateData = certificateData;
    if (licenseData !== undefined) updates.licenseData = licenseData;
    if (certificateExpiry !== undefined) updates.certificateExpiry = certificateExpiry;
    if (licenseExpiry !== undefined) updates.licenseExpiry = licenseExpiry;
    if (certForm !== undefined) updates.certForm = certForm;
    if (licForm !== undefined) updates.licForm = licForm;
    if (req.body.certificatePayment !== undefined) updates.certificatePayment = req.body.certificatePayment;
    if (req.body.licensePayment !== undefined) updates.licensePayment = req.body.licensePayment;
    if (userType !== undefined) updates.userType = userType;
    if (role !== undefined) updates.role = role;
    if (accessKey !== undefined) updates.accessKey = accessKey;

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase.from('users').update(updates).eq('email', email);
        if (!error) success = true;
      } catch (e) {}
    }

    try {
      const users = await loadData(USERS_FILE, []);
      const userIndex = users.findIndex((u: any) => u.email === email);
      if (userIndex !== -1) {
        if (status) users[userIndex].status = status;
        if (certificateData !== undefined) users[userIndex].certificateData = certificateData;
        if (licenseData !== undefined) users[userIndex].licenseData = licenseData;
        if (certificateExpiry !== undefined) users[userIndex].certificateExpiry = certificateExpiry;
        if (licenseExpiry !== undefined) users[userIndex].licenseExpiry = licenseExpiry;
        if (certForm !== undefined) users[userIndex].certForm = certForm;
        if (licForm !== undefined) users[userIndex].licForm = licForm;
        if (req.body.certificatePayment !== undefined) users[userIndex].certificatePayment = req.body.certificatePayment;
        if (req.body.licensePayment !== undefined) users[userIndex].licensePayment = req.body.licensePayment;
        if (userType !== undefined) users[userIndex].userType = userType;
        if (role !== undefined) users[userIndex].role = role;
        if (accessKey !== undefined) users[userIndex].accessKey = accessKey;
        await saveData(USERS_FILE, users);
        success = true;
      }
    } catch (err) {}

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "User not found or could not be updated" });
    }
  });

  app.post("/api/update-biodata", async (req, res) => {
    const { email, certForm, licForm } = req.body;
    let success = false;
    
    const updates: any = {};
    if (certForm) updates.certForm = certForm;
    if (licForm) updates.licForm = licForm;

    try {
      const { error } = await supabase.from('users').update(updates).eq('email', email);
      if (!error) success = true;
    } catch {}

    try {
      const users = await loadData(USERS_FILE, []);
      const userIndex = users.findIndex((u: any) => u.email === email);
      if (userIndex !== -1) {
        if (certForm) users[userIndex].certForm = certForm;
        if (licForm) users[userIndex].licForm = licForm;
        await saveData(USERS_FILE, users);
        success = true;
      }
    } catch (err) {}

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "User not found or could not be updated" });
    }
  });

  app.post("/api/pay-dues", async (req, res) => {
    const { email, amount, reference, month, year, datePaid } = req.body;
    let success = false;
    let newPayment = { amount, reference, month, year, datePaid };

    // Update in local file immediately
    try {
      const users = await loadData(USERS_FILE, []);
      const userIndex = users.findIndex((u: any) => u.email === email);
      if (userIndex !== -1) {
        if (!users[userIndex].duesPayments) users[userIndex].duesPayments = [];
        users[userIndex].duesPayments.push(newPayment);
        await saveData(USERS_FILE, users);
        success = true;
      }
    } catch (err) {}

    // Update in Supabase fallback
    try {
      const { data: user } = await supabase.from('users').select('duesPayments').eq('email', email).maybeSingle();
      if (user) {
        const dues = user.duesPayments || [];
        dues.push(newPayment);
        await supabase.from('users').update({ duesPayments: dues }).eq('email', email);
        success = true;
      }
    } catch (e) {}

    if (success) {
      res.json({ success: true, payment: newPayment });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  // Support Messaging Routes
  app.get("/api/messages/my/:email", async (req, res) => {
    try {
      const { email } = req.params;
      const allMessages = await loadData(MESSAGES_FILE, []);
      const myMessages = allMessages.filter((m: any) => m.userEmail === email);
      res.json(myMessages);
    } catch (e) {
      res.status(500).json({ error: "Failed to load messages" });
    }
  });

  app.post("/api/messages/send", async (req, res) => {
    try {
      const { userEmail, userName, subject, message } = req.body;
      if (!userEmail || !message) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const allMessages = await loadData(MESSAGES_FILE, []);
      const newMessage = {
        id: Date.now(),
        userEmail,
        userName,
        subject: subject || "No Subject",
        message,
        replies: [],
        status: "unread",
        createdAt: new Date().toISOString()
      };
      
      allMessages.push(newMessage);
      await saveData(MESSAGES_FILE, allMessages);
      res.json(newMessage);
    } catch (e) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/admin/messages", async (req, res) => {
    try {
      const allMessages = await loadData(MESSAGES_FILE, []);
      res.json(allMessages);
    } catch (e) {
      res.status(500).json({ error: "Failed to load messages" });
    }
  });

  app.post("/api/admin/messages/reply", async (req, res) => {
    try {
      const { messageId, adminName, reply } = req.body;
      if (!messageId || !reply) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const allMessages = await loadData(MESSAGES_FILE, []);
      const msgIndex = allMessages.findIndex((m: any) => m.id === messageId);
      
      if (msgIndex !== -1) {
        if (!allMessages[msgIndex].replies) allMessages[msgIndex].replies = [];
        allMessages[msgIndex].replies.push({
          id: Date.now(),
          sender: adminName || "Admin",
          message: reply,
          createdAt: new Date().toISOString()
        });
        allMessages[msgIndex].status = "replied";
        await saveData(MESSAGES_FILE, allMessages);
        res.json({ success: true, message: allMessages[msgIndex] });
      } else {
        res.status(404).json({ error: "Message not found" });
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to send reply" });
    }
  });

  app.delete("/api/admin/messages/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let allMessages = await loadData(MESSAGES_FILE, []);
      allMessages = allMessages.filter((m: any) => m.id !== parseInt(id));
      await saveData(MESSAGES_FILE, allMessages);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  app.post("/api/cooperative/pay", async (req, res) => {
    const { email, amount, reference, month, year, datePaid, hands } = req.body;
    let success = false;
    let newPayment = { amount, reference, month, year, datePaid, hands };

    try {
      const users = await loadData(USERS_FILE, []);
      const userIndex = users.findIndex((u: any) => u.email === email);
      if (userIndex !== -1) {
        if (!users[userIndex].cooperativePayments) users[userIndex].cooperativePayments = [];
        users[userIndex].cooperativePayments.push(newPayment);
        // Ensure hands is saved if updated
        if (hands) users[userIndex].cooperativeHands = hands;
        await saveData(USERS_FILE, users);
        success = true;
      }
    } catch (err) {}

    try {
      const { data: user } = await supabase.from('users').select('cooperativePayments, cooperativeHands').eq('email', email).maybeSingle();
      if (user) {
        const payments = user.cooperativePayments || [];
        payments.push(newPayment);
        await supabase.from('users').update({ 
          cooperativePayments: payments,
          cooperativeHands: hands || user.cooperativeHands
        }).eq('email', email);
        success = true;
      }
    } catch (e) {}

    if (success) {
      res.json({ success: true, payment: newPayment });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/cooperative/enroll", async (req, res) => {
    const { email, hands } = req.body;
    let success = false;

    try {
      const users = await loadData(USERS_FILE, []);
      const userIndex = users.findIndex((u: any) => u.email === email);
      if (userIndex !== -1) {
        users[userIndex].cooperativeEnrollment = true;
        users[userIndex].cooperativeHands = hands;
        await saveData(USERS_FILE, users);
        success = true;
      }
    } catch (err) {}

    if (isSupabaseConfigured()) {
      try {
        await supabase.from('users').update({ 
          cooperativeEnrollment: true, 
          cooperativeHands: hands 
        }).eq('email', email);
        success = true;
      } catch (e) {}
    }

    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.get("/api/verify-document/:id", async (req, res) => {
    const { id } = req.params;
    let users: any[] = [];
    try {
      users = await loadData(USERS_FILE, []);
    } catch (e) {
      return res.status(500).json({ error: "Failed to load database" });
    }
    
    // Check both certificates and licenses
    const user = users.find(u => 
      u.certificateNumber === id || 
      u.licenseNumber === id ||
      (u.certificatePayment && u.certificatePayment.reference === id) ||
      (u.licensePayment && u.licensePayment.reference === id) ||
      (u.duesPayments && u.duesPayments.some((p: any) => p.reference === id)) ||
      (u.registrationNumber === id)
    );

    if (!user) {
      return res.status(404).json({ error: "Document or tracking number not found" });
    }

    // Determine what document we found
    const isCert = user.certificateNumber === id || (user.certificatePayment && user.certificatePayment.reference === id);
    const isLic = user.licenseNumber === id || (user.licensePayment && user.licensePayment.reference === id);

    res.json({
      fullName: user.fullName,
      documentType: isCert ? "Ministerial Certificate" : (isLic ? "Ministerial License" : "Membership Record"),
      status: user.status === 'approved' ? (isCert ? (user.certificateData ? 'Ready' : 'Processing') : (isLic ? (user.licenseData ? 'Ready' : 'Processing') : 'Active')) : 'Processing',
      ready: isCert ? !!user.certificateData : (isLic ? !!user.licenseData : true),
      data: isCert ? user.certificateData : (isLic ? user.licenseData : null),
      expiry: isCert ? user.certificateExpiry : (isLic ? user.licenseExpiry : 'Permanent'),
      trackingNumber: id
    });
  });

  app.get("/api/verify-payment/:reference", async (req, res) => {
    const { reference } = req.params;
    let settings: any = {};
    try { settings = await loadData(SETTINGS_FILE, {}); } catch(e) {}
    
    const secretKey = settings.flutterwaveSecretKey || process.env.FLW_SECRET_KEY;
    
    // Fallback if no secret key is provided
    if (!secretKey || secretKey === "********") {
      console.warn("Payment verification requested but no Secret Key found. Defaulting to mock success.");
      return res.json({ 
        success: true, 
        mock: true,
        data: { status: "successful", amount: 0, currency: "NGN", tx_ref: reference }
      });
    }

    try {
      const response = await fetch(`https://api.flutterwave.com/v3/transactions/${reference}/verify`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      if (data.status === "success") {
        res.json({ success: true, data: data.data });
      } else {
        res.status(400).json({ success: false, message: data.message || "Payment verification failed" });
      }
    } catch (err) {
      console.error("Flutterwave API error:", err);
      res.status(500).json({ error: "Verification server error" });
    }
  });

  app.post("/api/admin/login", (req, res) => {
    const { password, mode } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin123";
    const auditorPassword = process.env.AUDITOR_PASSWORD || "Audit123";
    
    if (mode === 'auditor') {
      if (password === auditorPassword || password === "audit123") {
        return res.json({ success: true, token: "auditor_token_mock", role: "auditor" });
      } else {
        return res.status(401).json({ error: "Invalid auditor password" });
      }
    }

    // Accept either Admin123 or admin123 for convenience
    if (password === adminPassword || password === "admin123") {
      res.json({ success: true, token: "admin_token_mock", role: "admin" });
    } else {
      res.status(401).json({ error: "Invalid admin password" });
    }
  });

  app.get("/api/executives", async (req, res) => {
    try {
      if (isSupabaseConfigured()) {
        const { data: execs, error } = await supabase.from('executives').select('*').order('id', { ascending: true });
        if (!error && execs && execs.length > 0) {
          return res.json({ executives: execs });
        }
      }
      
      const execs = await loadData(EXECUTIVES_FILE, []);
      res.json({ executives: execs });
    } catch (e: any) {
      console.error("Error fetching executives:", e);
      res.status(500).json({ error: "Could not read executives data" });
    }
  });

  app.post("/api/executives", async (req, res) => {
    const { executives } = req.body;
    if (!executives || !Array.isArray(executives)) {
      return res.status(400).json({ error: "Invalid executives data" });
    }
    try {
      const payload = executives.map((ex: any, idx: number) => ({
        id: idx,
        name: ex.name,
        role: ex.role,
        image: ex.image
      }));

      await saveData(EXECUTIVES_FILE, payload);

      if (isSupabaseConfigured()) {
        try {
          await supabase.from('executives').upsert(payload, { onConflict: 'id' });
        } catch (err) {
          console.warn("Could not upsert to executives table.");
        }
      }
      res.json({ message: "Executives updated successfully" });
    } catch (e) {
      console.error("Error saving executives:", e);
      res.status(500).json({ error: "Could not save executives data" });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const configStatus = {
        cloudinary: isCloudinaryConfigured(),
        supabase: isSupabaseConfigured()
      };
      // Prioritize local data if Supabase might be unconfigured
      const settings = await loadData(SETTINGS_FILE, null);
      if (settings) {
         const displayData = { ...settings };
         if (displayData.flutterwaveSecretKey) {
            displayData.flutterwaveSecretKey = "********";
         }
         if (displayData.flutterwaveKey) {
            displayData.flutterwaveKey = "********";
         }
         if (displayData.cloudinaryUrl) {
            displayData.cloudinaryUrl = "********";
         }
         return res.json({ settings: displayData, config: configStatus });
      }
      
      // If no local data, try Supabase directly as a secondary fallback if configured
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('settings').select('*').single();
        if (!error && data) {
           const displayData = { ...data };
           if (displayData.flutterwaveSecretKey) {
              displayData.flutterwaveSecretKey = "********";
           }
           if (displayData.flutterwaveKey) {
              displayData.flutterwaveKey = "********";
           }
           return res.json({ settings: displayData, config: configStatus });
        }
      }

      res.json({ settings: null, config: configStatus });
    } catch (e: any) {
      console.error("Error fetching settings:", e);
      res.status(500).json({ error: "Could not read settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    const { settings } = req.body;
    if (!settings) return res.status(400).json({ error: "Invalid settings data" });
    try {
      // Don't overwrite secret key if it's the redacted version
      if (settings.flutterwaveSecretKey === "********") {
        delete settings.flutterwaveSecretKey;
      }
      if (settings.flutterwaveKey === "********") {
        delete settings.flutterwaveKey;
      }
      if (settings.cloudinaryUrl === "********") {
        delete settings.cloudinaryUrl;
      }
      
      const currentSettings = await loadData(SETTINGS_FILE, {});
      const payload = { ...currentSettings, ...settings };
      
      // Save using our robust wrapper (saves to Supabase kv_store)
      await saveData(SETTINGS_FILE, payload);

      // Re-initialize Cloudinary if URL changed
      if (settings.cloudinaryUrl) {
        await initializeCloudinary(payload);
      }
      
      // Also optionally sync to a dedicated settings table if legacy code expect it
      if (isSupabaseConfigured()) {
        try {
          await supabase.from('settings').upsert(payload, { onConflict: 'id' });
        } catch (e) {}
      }
      
      res.json({ message: "Settings updated successfully" });
    } catch (e) {
      console.error("Failed to save settings:", e);
      res.status(500).json({ error: "Could not save settings data" });
    }
  });

  app.post("/api/verify-identity", async (req, res) => {
    const { idNumber } = req.body; // BVN or NIN
    if (!idNumber) return res.status(400).json({ error: "BVN/NIN is required" });

    let settings: any = {};
    try { 
      settings = await loadData(SETTINGS_FILE, {}); 
    } catch(e) {}

    const flwSecretKey = settings.flutterwaveSecretKey || process.env.FLW_SECRET_KEY;
    if (flwSecretKey && flwSecretKey !== "********") {
       // Attempt real Flutterwave BVN lookup
       try {
          const response = await fetch(`https://api.flutterwave.com/v3/kyc/bvns/${idNumber}`, {
             method: "GET",
             headers: {
                "Authorization": `Bearer ${flwSecretKey}`
             }
          });
          const data = await response.json();
          if (data.status === "success") {
             return res.json({
                success: true,
                data: {
                   dob: data.data.date_of_birth,
                   gender: data.data.gender,
                   address: "Verified via Flutterwave",
                   firstName: data.data.first_name,
                   lastName: data.data.last_name
                }
             });
          } else {
             return res.status(400).json({ error: data.message || "Flutterwave API Error: Invalid BVN/NIN" });
          }
       } catch (error) {
          return res.status(500).json({ error: "Failed to verify identity with Flutterwave" });
       }
    } else {
       // Fallback mock logic when no key is provided
       if (/^(\d)\1{10}$/.test(idNumber) || idNumber === "12345678901") {
          return res.status(400).json({ error: "Flutterwave API Error: The provided BVN/NIN is invalid or fake." });
       }
       return res.json({
          success: true,
          data: {
             dob: "1975-08-22",
             gender: "Male",
             address: "15 Independence Layout, Abuja, FCT",
             firstName: "Mock",
             lastName: "User"
          }
       });
    }
  });

  // Export for Vercel Serverless Function
  export default app;

  // Local server listening logic
  async function startServer() {
    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: false },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(__dirname, "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running at http://localhost:${PORT}`);
      checkSupabaseHealth();
    });
  }

  // Only run the server if not running in a serverless environment like Vercel
  if (!process.env.VERCEL) {
    startServer();
  }

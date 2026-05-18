import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;
  const db = new Database("restaurant.db");

  // Initialize DB
  db.exec(`
    CREATE TABLE IF NOT EXISTS cafes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cafe_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT,
      image_url TEXT,
      available INTEGER DEFAULT 1,
      FOREIGN KEY(cafe_id) REFERENCES cafes(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cafe_id TEXT NOT NULL,
      table_number TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(cafe_id) REFERENCES cafes(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      menu_item_id INTEGER,
      quantity INTEGER,
      price REAL,
      FOREIGN KEY(order_id) REFERENCES orders(id),
      FOREIGN KEY(menu_item_id) REFERENCES menu_items(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      cafe_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT,
      PRIMARY KEY (cafe_id, key),
      FOREIGN KEY(cafe_id) REFERENCES cafes(id)
    );
  `);

  app.use(express.json());

  // Middleware to extract cafe_id
  const getCafeId = (req: any, res: express.Response, next: express.NextFunction) => {
    // some routes like /api/cafes don't need this
    const cafeId = req.headers["x-cafe-id"] || req.query.cafe_id;
    if (!cafeId) {
      return res.status(400).json({ error: "Missing cafe_id" });
    }
    req.cafeId = cafeId as string;
    next();
  };

  // API Routes for Cafes
  app.post("/api/cafes", (req, res) => {
    const { id, name } = req.body;
    try {
      db.prepare("INSERT INTO cafes (id, name) VALUES (?, ?)").run(id, name);
      // add default settings
      db.prepare("INSERT INTO settings (cafe_id, key, value) VALUES (?, ?, ?)").run(id, 'service_enabled', 'true');
      db.prepare("INSERT INTO settings (cafe_id, key, value) VALUES (?, ?, ?)").run(id, 'cafe_name', name);
      
      // Seed default menu
      const seed = db.prepare("INSERT INTO menu_items (cafe_id, name, description, price, category) VALUES (?, ?, ?, ?, ?)");
      seed.run(id, "Classic Burger", "Juicy beef patty with cheese", 12.5, "Main");
      seed.run(id, "Caesar Salad", "Fresh romaine with croutons", 9.0, "Starter");
      seed.run(id, "Iced Latte", "Freshly brewed with cold milk", 4.5, "Drinks");
      seed.run(id, "Margarita Pizza", "Tomato sauce, mozzarella, basil", 14.0, "Main");

      res.json({ success: true, id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/cafes/:id", (req, res) => {
    const cafe = db.prepare("SELECT * FROM cafes WHERE id = ?").get(req.params.id);
    if (!cafe) return res.status(404).json({ error: "Not found" });
    res.json(cafe);
  });

  // API Routes (Tenant Scoped)
  app.get("/api/settings", getCafeId, (req: any, res) => {
    const settings = db.prepare("SELECT * FROM settings WHERE cafe_id = ?").all(req.cafeId);
    const config: any = {};
    settings.forEach((s: any) => config[s.key] = s.value);
    res.json(config);
  });

  app.post("/api/admin/settings", getCafeId, (req: any, res) => {
    const { key, value } = req.body;
    db.prepare("INSERT OR REPLACE INTO settings (cafe_id, key, value) VALUES (?, ?, ?)").run(req.cafeId, key, value);
    res.json({ success: true });
  });

  app.get("/api/admin/stats", getCafeId, (req: any, res) => {
    const totalSales = db.prepare("SELECT SUM(total_price) as total FROM orders WHERE cafe_id = ? AND status = 'completed'").get(req.cafeId) as any;
    const orderCount = db.prepare("SELECT COUNT(*) as count FROM orders WHERE cafe_id = ?").get(req.cafeId) as any;
    const dailySales = db.prepare("SELECT DATE(created_at) as date, SUM(total_price) as total FROM orders WHERE cafe_id = ? AND status = 'completed' GROUP BY date").all(req.cafeId);
    
    res.json({
      totalSales: totalSales.total || 0,
      orderCount: orderCount.count || 0,
      dailySales
    });
  });

  app.get("/api/menu", getCafeId, (req: any, res) => {
    const items = db.prepare("SELECT * FROM menu_items WHERE cafe_id = ? AND available = 1").all(req.cafeId);
    res.json(items);
  });

  app.get("/api/admin/menu", getCafeId, (req: any, res) => {
    const items = db.prepare("SELECT * FROM menu_items WHERE cafe_id = ?").all(req.cafeId);
    res.json(items);
  });

  app.post("/api/admin/menu", getCafeId, (req: any, res) => {
    const { name, description, price, category, image_url } = req.body;
    const info = db.prepare("INSERT INTO menu_items (cafe_id, name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)")
      .run(req.cafeId, name, description, price, category, image_url);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/admin/menu/:id", getCafeId, (req: any, res) => {
    const { name, description, price, category, image_url, available } = req.body;
    db.prepare("UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, image_url = ?, available = ? WHERE id = ? AND cafe_id = ?")
      .run(name, description, price, category, image_url, available ? 1 : 0, req.params.id, req.cafeId);
    res.json({ success: true });
  });

  app.delete("/api/admin/menu/:id", getCafeId, (req: any, res) => {
    db.prepare("DELETE FROM menu_items WHERE id = ? AND cafe_id = ?").run(req.params.id, req.cafeId);
    res.json({ success: true });
  });

  app.get("/api/orders", getCafeId, (req: any, res) => {
    const orders = db.prepare(`
      SELECT o.*, 
             (SELECT json_group_array(json_object('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price))
              FROM order_items oi 
              JOIN menu_items mi ON oi.menu_item_id = mi.id 
              WHERE oi.order_id = o.id) as items
      FROM orders o
      WHERE o.cafe_id = ?
      ORDER BY created_at DESC
    `).all(req.cafeId);
    
    const parsedOrders = orders.map((o: any) => ({
      ...o,
      items: JSON.parse(o.items)
    }));
    
    res.json(parsedOrders);
  });

  app.post("/api/orders", getCafeId, (req: any, res) => {
    const { table_number, items, total_price } = req.body;
    
    const transaction = db.transaction(() => {
      const orderInfo = db.prepare("INSERT INTO orders (cafe_id, table_number, total_price) VALUES (?, ?, ?)")
        .run(req.cafeId, table_number, total_price);
      
      const orderId = orderInfo.lastInsertRowid;
      const insertItem = db.prepare("INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)");
      
      for (const item of items) {
        insertItem.run(orderId, item.id, item.quantity, item.price);
      }
      
      return orderId;
    });

    try {
      const orderId = transaction();
      const newOrder = {
        id: orderId,
        table_number,
        total_price,
        status: 'pending',
        created_at: new Date().toISOString(),
        items: items.map((i: any) => ({ name: i.name, quantity: i.quantity, price: i.price }))
      };
      
      io.to(req.cafeId).emit("order:new", newOrder);
      res.json({ success: true, orderId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", getCafeId, (req: any, res) => {
    const { status } = req.body;
    db.prepare("UPDATE orders SET status = ? WHERE id = ? AND cafe_id = ?").run(status, req.params.id, req.cafeId);
    
    io.to(req.cafeId).emit("order:update", { id: req.params.id, status });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Socket connection with simple "room" per cafe
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    socket.on("join:cafe", (cafeId) => {
      socket.join(cafeId);
      console.log(`Socket ${socket.id} joined cafe: ${cafeId}`);
    });

    socket.on("disconnect", () => console.log("Client disconnected"));
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();


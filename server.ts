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
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      category TEXT,
      image_url TEXT,
      available INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_number TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      total_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
  `);

  // Seed data if empty
  const itemCount = db.prepare("SELECT COUNT(*) as count FROM menu_items").get() as { count: number };
  if (itemCount.count === 0) {
    const seed = db.prepare("INSERT INTO menu_items (name, description, price, category) VALUES (?, ?, ?, ?)");
    seed.run("Classic Burger", "Juicy beef patty with cheese", 12.5, "Main");
    seed.run("Caesar Salad", "Fresh romaine with croutons", 9.0, "Starter");
    seed.run("Iced Latte", "Freshly brewed with cold milk", 4.5, "Drinks");
    seed.run("Margarita Pizza", "Tomato sauce, mozzarella, basil", 14.0, "Main");
  }

  app.use(express.json());

  // API Routes
  app.get("/api/menu", (req, res) => {
    const items = db.prepare("SELECT * FROM menu_items WHERE available = 1").all();
    res.json(items);
  });

  app.get("/api/admin/menu", (req, res) => {
    const items = db.prepare("SELECT * FROM menu_items").all();
    res.json(items);
  });

  app.post("/api/admin/menu", (req, res) => {
    const { name, description, price, category, image_url } = req.body;
    const info = db.prepare("INSERT INTO menu_items (name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?)")
      .run(name, description, price, category, image_url);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/admin/menu/:id", (req, res) => {
    const { name, description, price, category, image_url, available } = req.body;
    db.prepare("UPDATE menu_items SET name = ?, description = ?, price = ?, category = ?, image_url = ?, available = ? WHERE id = ?")
      .run(name, description, price, category, image_url, available ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/admin/menu/:id", (req, res) => {
    db.prepare("DELETE FROM menu_items WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/orders", (req, res) => {
    const orders = db.prepare(`
      SELECT o.*, 
             (SELECT json_group_array(json_object('id', oi.id, 'name', mi.name, 'quantity', oi.quantity, 'price', oi.price))
              FROM order_items oi 
              JOIN menu_items mi ON oi.menu_item_id = mi.id 
              WHERE oi.order_id = o.id) as items
      FROM orders o
      ORDER BY created_at DESC
    `).all();
    
    // Parse the JSON string from sqlite
    const parsedOrders = orders.map((o: any) => ({
      ...o,
      items: JSON.parse(o.items)
    }));
    
    res.json(parsedOrders);
  });

  app.post("/api/orders", (req, res) => {
    const { table_number, items, total_price } = req.body;
    
    const transaction = db.transaction(() => {
      const orderInfo = db.prepare("INSERT INTO orders (table_number, total_price) VALUES (?, ?)")
        .run(table_number, total_price);
      
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
      
      io.emit("order:new", newOrder);
      res.json({ success: true, orderId });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", (req, res) => {
    const { status } = req.body;
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, req.params.id);
    
    io.emit("order:update", { id: req.params.id, status });
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

  // Socket connection
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    socket.on("disconnect", () => console.log("Client disconnected"));
  });

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

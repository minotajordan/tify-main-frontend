import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3333;
const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');
const GUESTS_FILE = path.join(__dirname, 'data', 'guests.json');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Ensure data directory and files exist
if (!fs.existsSync(path.dirname(EVENTS_FILE))) {
  fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true });
}
if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, '[]', 'utf8');
if (!fs.existsSync(GUESTS_FILE)) fs.writeFileSync(GUESTS_FILE, '[]', 'utf8');

// --- Helpers ---
const readJSON = (file) => {
  try {
    const data = fs.readFileSync(file, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return [];
  }
};

const writeJSON = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
};

// --- Routes ---

// GET All Events (without full guest list to save bandwidth, or maybe minimal)
app.get('/api/events', (req, res) => {
  const events = readJSON(EVENTS_FILE);
  // Optional: Attach guest count?
  res.json(events);
});

// GET Single Event (Hydrate with Guests)
app.get('/api/events/:id', (req, res) => {
  const events = readJSON(EVENTS_FILE);
  const event = events.find(e => e.id === req.params.id);
  
  if (event) {
    const allGuests = readJSON(GUESTS_FILE);
    const eventGuests = allGuests.filter(g => g.eventId === event.id);
    
    // Sort by createdAt desc if available, or name
    // eventGuests.sort((a, b) => ...);
    
    // Merge guests into event object for frontend compatibility
    const eventWithGuests = {
      ...event,
      guestList: eventGuests
    };
    
    res.json(eventWithGuests);
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

// POST Create Event
app.post('/api/events', (req, res) => {
  try {
    const events = readJSON(EVENTS_FILE);
    const newEvent = {
      ...req.body,
      id: req.body.id || Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Separate guests if provided
    const guests = newEvent.guestList || [];
    delete newEvent.guestList; // Don't store guests in events.json
    
    events.push(newEvent);
    
    if (writeJSON(EVENTS_FILE, events)) {
      // Save guests to guests.json
      if (guests.length > 0) {
        const allGuests = readJSON(GUESTS_FILE);
        const newGuests = guests.map(g => ({
          ...g,
          id: g.id || Math.random().toString(36).substr(2, 9),
          eventId: newEvent.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        allGuests.push(...newGuests);
        writeJSON(GUESTS_FILE, allGuests);
        
        // Return event with guests
        res.status(201).json({ ...newEvent, guestList: newGuests });
      } else {
        res.status(201).json({ ...newEvent, guestList: [] });
      }
    } else {
      res.status(500).json({ error: 'Failed to write event data' });
    }
  } catch (e) {
    console.error('POST Error:', e);
    res.status(500).json({ error: 'Internal server error', details: e.message });
  }
});

// PUT Update Event
app.put('/api/events/:id', (req, res) => {
  try {
    const events = readJSON(EVENTS_FILE);
    const index = events.findIndex(e => e.id === req.params.id);
    
    if (index !== -1) {
      const incomingData = { ...req.body };
      const incomingGuests = incomingData.guestList; // Extract guests
      delete incomingData.guestList; // Don't save to events.json

      // Update Event
      const updatedEvent = { 
        ...events[index], 
        ...incomingData, 
        updatedAt: new Date().toISOString() 
      };
      events[index] = updatedEvent;
      writeJSON(EVENTS_FILE, events);

      // Handle Guests if provided
      let finalGuestList = [];
      if (incomingGuests && Array.isArray(incomingGuests)) {
        const allGuests = readJSON(GUESTS_FILE);
        
        // Strategy: 
        // 1. Remove all existing guests for this event (Full Sync Strategy) - Safest for "Save what I see"
        // OR
        // 2. Upsert (Complex). 
        // User wants "GUARDAR CORRECTAMENTE". Full Sync is usually safer for a "Save" button behavior.
        
        const otherGuests = allGuests.filter(g => g.eventId !== req.params.id);
        
        const newEventGuests = incomingGuests.map(g => ({
          ...g,
          id: g.id || Math.random().toString(36).substr(2, 9),
          eventId: req.params.id,
          updatedAt: new Date().toISOString(),
          createdAt: g.createdAt || new Date().toISOString()
        }));
        
        const newAllGuests = [...otherGuests, ...newEventGuests];
        writeJSON(GUESTS_FILE, newAllGuests);
        finalGuestList = newEventGuests;
      } else {
        // If no guestList sent, fetch existing ones to return
        const allGuests = readJSON(GUESTS_FILE);
        finalGuestList = allGuests.filter(g => g.eventId === req.params.id);
      }

      res.json({ ...updatedEvent, guestList: finalGuestList });
    } else {
      res.status(404).json({ error: 'Event not found' });
    }
  } catch (e) {
    console.error('PUT Error:', e);
    res.status(500).json({ error: 'Internal server error', details: e.message });
  }
});

app.delete('/api/events/:id', (req, res) => {
  let events = readJSON(EVENTS_FILE);
  const initialLength = events.length;
  events = events.filter(e => e.id !== req.params.id);
  
  if (events.length < initialLength) {
    writeJSON(EVENTS_FILE, events);
    
    // Cleanup guests
    const allGuests = readJSON(GUESTS_FILE);
    const remainingGuests = allGuests.filter(g => g.eventId !== req.params.id);
    writeJSON(GUESTS_FILE, remainingGuests);
    
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Event not found' });
  }
});

// Mock stats
app.get('/api/events/:id/stats', (req, res) => {
  res.json({
    activeUsers: Math.floor(Math.random() * 100),
    recentPurchases: [],
    revenue: 0
  });
});

app.listen(PORT, () => {
  console.log(`API Server running on http://localhost:${PORT}`);
  console.log(`Events DB: ${EVENTS_FILE}`);
  console.log(`Guests DB: ${GUESTS_FILE}`);
});

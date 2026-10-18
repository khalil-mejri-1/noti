require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/contact_db';

const userSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

const sampleUsers = [
  {
    name: 'Wade Warren',
    email: 'wade.warren@example.com',
    password: 'password123',
  },
  {
    name: 'Cameron Williamson',
    email: 'cameron.w@example.com',
    password: 'password123',
  },
  {
    name: 'Brooklyn Simmons',
    email: 'brooklyn.s@example.com',
    password: 'password123',
  },
  {
    name: 'Leslie Alexander',
    email: 'leslie.a@example.com',
    password: 'password123',
  },
  {
    name: 'Theresa Webb',
    email: 'theresa.webb@example.com',
    password: 'password123',
  },
];

async function seed() {
  try {
    console.log('Connexion à MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connecté avec succès.');

    for (const u of sampleUsers) {
      const exists = await User.findOne({ email: u.email.toLowerCase() });
      if (!exists) {
        await User.create(u);
        console.log(`+ Utilisateur ajouté : ${u.name} (${u.email})`);
      } else {
        console.log(`= Utilisateur déjà existant : ${u.name} (${u.email})`);
      }
    }

    const total = await User.countDocuments();
    console.log(`\n🎉 Terminé ! Nombre total d'utilisateurs dans la base : ${total}`);
  } catch (err) {
    console.error('❌ Erreur lors de l\'insertion :', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Déconnecté.');
  }
}

seed();

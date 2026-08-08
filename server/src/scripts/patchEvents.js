const mongoose = require('mongoose');
const Event = require('../models/Event');

const MONGODB_URI = 'mongodb+srv://ibrahimkhokhartecs:123@cluster0.frokc.mongodb.net/khana_pk?retryWrites=true&w=majority';

async function patchEvents() {
  await mongoose.connect(MONGODB_URI);

  // Patch events missing createdByModel
  const result = await Event.updateMany(
    { createdByModel: { $exists: false } },
    { $set: { createdByModel: 'User' } }
  );

  console.log('Patched events:', result.modifiedCount);
  await mongoose.disconnect();
}

patchEvents(); 
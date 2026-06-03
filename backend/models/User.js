import mongoose from 'mongoose';

const savedSchemeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  benefits: { type: String },
  status: { type: String, default: 'pending' }, // 'pending', 'applied', 'approved'
  updatedAt: { type: String },
  completedSteps: { type: [Number], default: [] } // indices of steps checked complete
});

const searchHistorySchema = new mongoose.Schema({
  query: { type: String, required: true },
  method: { type: String, required: true }, // 'API' or 'CACHE'
  route: { type: String, required: true }, // 'Gemini 3.1', 'Atlas DB' etc.
  timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  profile: {
    name: { type: String, default: '' },
    age: { type: Number },
    gender: { type: String, default: '' },
    state: { type: String, default: '' },
    city: { type: String, default: '' },
    income: { type: Number },
    category: { type: String, default: '' },
    profession: { type: String, default: '' },
    education: { type: String, default: '' },
    disability: { type: String, default: 'No' },
    minority: { type: String, default: 'No' }
  },
  savedSchemes: { type: [savedSchemeSchema], default: [] },
  searchHistory: { type: [searchHistorySchema], default: [] }
}, { timestamps: true });

export default mongoose.model('User', userSchema);

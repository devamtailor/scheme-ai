import mongoose from 'mongoose';

const schemeSchema = new mongoose.Schema({
  name: String,
  description: String,
  eligibility: {
    min_income: Number,
    max_income: Number,
    category: [String],
    state: [String],
    profession: [String]
  },
  benefits: String,
  documents: [String],
  application_steps: [String],
  apply_link: String
});

export default mongoose.model('Scheme', schemeSchema);

const mongoose = require('mongoose');

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

module.exports = mongoose.model('Scheme', schemeSchema);

import mongoose from 'mongoose';

const schemeCacheSchema = new mongoose.Schema({
  queryKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  queryType: {
    type: String,
    required: true,
    enum: ['chat', 'profile']
  },
  response: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800 // TTL cache expiration: 7 days (in seconds)
  }
});

export default mongoose.model('CachedSchemeResponse', schemeCacheSchema);

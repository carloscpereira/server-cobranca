import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['sendMail', 'sendSms', 'sendWhatsapp', 'paymentSlip'],
      required: true,
    },
    code: {
      type: Number,
      required: true,
    },
    request: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    error: {
      type: Boolean,
    },
  },
  { timestamps: true },
);

export default mongoose.model('Log', LogSchema);

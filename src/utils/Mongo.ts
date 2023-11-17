import mongoose, { Mongoose } from 'mongoose';

class Mongo {
  public mongoConnection: Promise<Mongoose>;

  constructor() {
    this.mongoConnection = mongoose.connect(process.env.MONGO_URL as string, {
      useNewUrlParser: true,
      useFindAndModify: true,
      useUnifiedTopology: true,
    });
  }
}

export default new Mongo();

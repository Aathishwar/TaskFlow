import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  _id: Types.ObjectId;
  googleId?: string;
  firebaseUid?: string;
  email: string;
  displayName: string;
  profilePicture?: string;
  bio?: string;
  phone?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true, // allows null values while maintaining uniqueness
    index: true
  },
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true, // allows null values while maintaining uniqueness
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: '',
    maxlength: 500
  },
  phone: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: '',
    maxlength: 100
  }
}, {
  timestamps: true,
  versionKey: false
});

// Instance methods (removed duplicate indexes)
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.__v;
  return user;
};

export default mongoose.model<IUser>('User', UserSchema);

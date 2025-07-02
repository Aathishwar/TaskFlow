import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User, { IUser } from '../models/user.model';

export const configurePassport = (): void => {
  // JWT Strategy for Firebase authentication
  passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'fallback-secret-key'
  },
  async (payload: any, done: any) => {
    try {
      const user = await User.findById(payload.userId);
      if (user) {
        return done(null, user);
      }
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  }));

  // Serialize user for session
  passport.serializeUser((user: any, done: any) => {
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done: any) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

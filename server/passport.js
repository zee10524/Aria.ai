const LocalStrategy = require("passport-local").Strategy;
const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const bcrypt = require("bcryptjs");
const User = require("./models/User");

module.exports = function (passport) {
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const normalizedEmail = email.trim().toLowerCase();
          const user = await User.findOne({ email: normalizedEmail });
          if (!user) return done(null, false);
          if (!user.isVerified) return done(null, false);

          const match = await bcrypt.compare(password, user.password);
          if (!match) return done(null, false);

          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
      },
      async (payload, done) => {
        try {
          const user = await User.findById(payload.id);
          if (!user) return done(null, false);
          return done(null, user);
        } catch (err) {
          done(err, false);
        }
      }
    )
  );
};
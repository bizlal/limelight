// /api-lib/middlewares/auths.js
import passport from "@/api-lib/auth/passport";
import session from "./session";

// "auths" is the chain of 3 middlewares
// If you want a stateless approach, remove session / passport.session().
const auths = [session, passport.initialize()];

export default auths;

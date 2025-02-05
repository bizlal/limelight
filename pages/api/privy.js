// /pages/api/auth/privy.js
import nc from "next-connect";
import auths from "@/api-lib/middlewares/auth";
import passport from "@/api-lib/auth/passport";

const handler = nc();
handler.use(...auths);

handler.post(passport.authenticate("privy"), (req, res) => {
  return res.json({ user: req.user });
});

export default handler;

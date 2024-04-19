import { OAuth2Client } from 'google-auth-library';

export const middleware = async (req, res, next) => {
  const client = new OAuth2Client();

  try {
    const idToken = req.headers.authorization?.split(' ')[1];
    if (!idToken) {
      throw new Error('Authorization token not provided');
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: "987500975578-knh8d24kfs43gj8bbu94ekarpjkpppsp.apps.googleusercontent.com",
    });

    const payload = ticket.getPayload();
    // const userid = payload['sub'];

    // If request specified a G Suite domain:
    // const domain = payload['hd'];

    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: 'Unauthorized' });
  }
};

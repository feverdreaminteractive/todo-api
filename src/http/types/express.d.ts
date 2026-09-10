export {};

// Lets validate() middleware attach its parsed result (e.g. typed query
// filters) without fighting Express's built-in req.query typing (ParsedQs).
declare global {
  namespace Express {
    interface Request {
      validated?: unknown;
    }
  }
}

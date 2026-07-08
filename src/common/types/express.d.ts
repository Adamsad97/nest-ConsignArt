import { AuthenticatedUser } from '../decorators/current-user.decorator';

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

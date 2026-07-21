import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../services/firebase';
import { UserRole } from '../types';

export interface AuthRequest extends Request {
  uid?: string;
  role?: UserRole;
  profileId?: string;
}

export function requireAuth(roles?: UserRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    try {
      const decoded = await auth().verifyIdToken(token);
      req.uid = decoded.uid;

      // Look up profile to get role
      const freelancerDoc = await db().collection('freelancers').where('uid', '==', decoded.uid).limit(1).get();
      const recruiterDoc  = await db().collection('recruiters').where('uid', '==', decoded.uid).limit(1).get();

      if (!freelancerDoc.empty) {
        req.role = 'freelancer';
        req.profileId = freelancerDoc.docs[0].id;
      } else if (!recruiterDoc.empty) {
        req.role = 'recruiter';
        req.profileId = recruiterDoc.docs[0].id;
      } else {
        return res.status(403).json({ success: false, error: 'Profile not found — complete onboarding first' });
      }

      if (roles && !roles.includes(req.role)) {
        return res.status(403).json({ success: false, error: `Access restricted to: ${roles.join(', ')}` });
      }

      next();
    } catch {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
  };
}

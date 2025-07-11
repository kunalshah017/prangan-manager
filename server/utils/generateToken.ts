import jwt from 'jsonwebtoken';

export const generToken = (userId: string) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined in environment variables');
    }

    // Use an object payload instead of a string to support expiresIn
    const token = jwt.sign(
        { userId }, // Object payload
        secret,
        {
            expiresIn: '30d', 
        }
    );

    return token;
}
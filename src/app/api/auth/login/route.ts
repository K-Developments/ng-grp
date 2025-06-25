
import { NextResponse, type NextRequest } from 'next/server';
import { UserService } from '@/lib/userService';
import type { User } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Special case for admin login
    if (username.toLowerCase() === 'admin' && password === '123') {
      const adminUser: Omit<User, 'password_hashed_or_plain'> = {
        id: 'admin_special_user', // Static ID for the special admin user
        username: 'admin',
        name: 'Administrator',
        role: 'admin',
      };
      return NextResponse.json(adminUser);
    }

    // Existing logic for database users
    const user = await UserService.getUserByUsername(username.toLowerCase());

    if (!user || user.password_hashed_or_plain !== password) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hashed_or_plain, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'An internal server error occurred' }, { status: 500 });
  }
}

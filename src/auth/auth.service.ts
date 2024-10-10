import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthDto } from './dto';
import * as argon from 'argon2';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prismaService: PrismaService,
    private userService: UserService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: AuthDto) {
    const passwordHash = await argon.hash(dto.password);

    try {
      const newUser = await this.prismaService.user.create({
        data: {
          ...dto,
          password: passwordHash,
        },
      });

      return {
        message: 'Successfully signed up',
        data: { newUser },
      };
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForbiddenException('Email already registered');
      }
    }
  }

  async login(user: any) {
    const payload = {
      username: user.email,
      sub: user.id,
    };

    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_TOKEN'),
        expiresIn: '15m',
      }),
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.userService.getUser(email);

    if (user && (await argon.verify(user.password, password))) {
      return user;
    }

    return null;
  }
}

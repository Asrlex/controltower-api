import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import {
  LoggedUserI,
  UserI,
} from '../home-management/entities/interfaces/home-management.entity';
import { CreateUserDto } from '../entities/dtos/home-management/user.dto';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SuccessCodes } from '../entities/enums/response-codes.enum';
import { UserRepository } from './repository/user.repository.interface';
import { AuthMessages } from './entities/enums/auth.enum';
import {
  AuthenticationResponseJSON,
  generateRegistrationOptions,
  RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: UserRepository,
    private readonly logger: Logger,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Método para verificar si el endpoint de autenticación esta funcionando
   * @returns string - mensaje indicando que el endpoint de autenticación esta funcionando
   */
  async status() {
    return {
      statusCode: SuccessCodes.Ok,
      message: AuthMessages.AuthEndpointWorking,
    };
  }

  /**
   * Método para iniciar sesión
   * @param dto - usuario
   * @returns string - token de autenticación
   */
  async login(dto: CreateUserDto): Promise<LoggedUserI> {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) {
      throw new UnauthorizedException(AuthMessages.InvalidCredentials);
    }
    const payload = { email: user.userEmail, sub: user.userID };
    const token = this.createToken(payload);
    return {
      user,
      token,
    };
  }

  /**
   * Método para registrar un nuevo usuario
   * @param email - email del usuario
   * @param password - contraseña del usuario
   * @returns string - usuario creado
   */
  async signup(signupDto: CreateUserDto): Promise<LoggedUserI> {
    const existingUser = await this.userRepository.findByEmail(signupDto.email);
    if (existingUser) {
      throw new UnauthorizedException(AuthMessages.UserAlreadyExists);
    }
    const hashedPassword = await bcrypt.hash(signupDto.password, 10);
    if (!hashedPassword) {
      throw new UnauthorizedException(AuthMessages.PasswordHashingFailed);
    }
    signupDto.password = hashedPassword;
    const user = await this.userRepository.create(signupDto);
    if (!user) {
      throw new UnauthorizedException(AuthMessages.UserCreationFailed);
    }

    const payload = { email: user.userEmail, sub: user.userID };
    const token = this.createToken(payload);
    return {
      user,
      token,
    };
  }

  /**
   * Método para validar un usuario
   * @param email - email del usuario
   * @param password - contraseña del usuario
   * @returns string - usuario validado
   */
  private async validateUser(email: string, password: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }
    const isPasswordValid = await bcrypt.compare(password, user.userPassword);
    if (!isPasswordValid) {
      return null;
    }
    return user;
  }

  /**
   * Método para obtener el token de la petición
   * @param request - petición HTTP
   * @returns string - token de autenticación
   */
  async getTokenFromRequest(request: Request): Promise<string> {
    const token = request.headers['authorization']?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException(AuthMessages.NoTokenProvided);
    }
    return token;
  }

  /**
   * Método para verificar si el token es válido
   * @param token - token de autenticación
   * @returns string - usuario validado
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      return !!decoded;
    } catch (error) {
      console.error('Error validating token', error);
      return false;
    }
  }

  /**
   * Método para obtener el usuario a partir del token
   * @param token - token de autenticación
   * @returns string - usuario validado
   */
  async getUserFromToken(token: string): Promise<UserI> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      const user = await this.userRepository.findByEmail(decoded.email);
      if (!user) {
        throw new UnauthorizedException(AuthMessages.UserNotFound);
      }
      return user;
    } catch (error) {
      console.error('Error getting user from token', error);
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }
  }

  /**
   * Método para crear un token de autenticación
   * @param payload - carga útil del token
   * @returns string - token de autenticación
   */
  private createToken(payload: { email: string; sub: number }): string {
    const token: string = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRATION,
    });
    return token;
  }

  /**
   * Método para validar el token de un usuario de Cognito
   * @param request - petición HTTP
   * @returns string - usuario validado
   */
  async authenticateCognitoUser(req: Request): Promise<{ email: string }> {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException(AuthMessages.NoTokenProvided);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException(AuthMessages.NoTokenProvided);
    }

    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.COGNITO_SECRET,
      });
      return { email: decoded.email };
    } catch (error) {
      throw new UnauthorizedException(AuthMessages.InvalidToken);
    }
  }

  /**
   * Método para obtener opciones de registro de WebAuthn
   * @param user - usuario
   * @returns string - opciones de registro de WebAuthn
   */
  async generateRegistrationOptions(user: UserI): Promise<any> {
    const options = await generateRegistrationOptions({
      rpName: 'Home Management App',
      rpID: process.env.RP_ID,
      userID: new TextEncoder().encode(user.userID.toString()),
      userName: user.userEmail,
      attestationType: 'direct',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    });

    await this.userRepository.saveChallenge(user.userID, options.challenge);

    return options;
  }

  /**
   * Método para registrar biometría de un usuario
   * @param user - usuario
   * @param options - opciones de registro
   * @returns string - registro de biometría
   */
  async verifyAndStoreRegistration(
    user: UserI,
    attestation: RegistrationResponseJSON,
  ): Promise<any> {
    const expectedChallenge = await this.userRepository.findChallenge(
      user.userID,
    );
    const verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge,
      expectedOrigin: process.env.ORIGIN,
      expectedRPID: process.env.RP_ID,
    });

    if (!verification.verified) {
      throw new UnauthorizedException('Biometric verification failed');
    }

    const { credential } = verification.registrationInfo;
    await this.userRepository.saveBiometricCredential(
      user.userID,
      credential.id,
      credential.publicKey,
    );

    return verification.registrationInfo;
  }

  /**
   * Método para autenticar biometría de un usuario
   * @param user - usuario
   * @param assertion - opciones de autenticación
   * @returns string - autenticación de biometría
   */
  async verifyAuthenticationAssertion(
    user: UserI,
    assertion: AuthenticationResponseJSON,
  ): Promise<any> {
    const expectedChallenge = await this.userRepository.findChallenge(
      user.userID,
    );
    const credentials = await this.userRepository.findCredentials(user.userID);
    const verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: process.env.ORIGIN,
      expectedRPID: process.env.RP_ID,
      credential: {
        id: credentials.credentialID,
        publicKey: new Uint8Array(
          credentials.credentialPublicKey.buffer.slice(0),
        ) as Uint8Array<ArrayBuffer>,
        counter: credentials.credentialCounter,
      },
    });

    if (!verification.verified) {
      throw new UnauthorizedException('Biometric verification failed');
    }

    await this.userRepository.updateCredentialCounter(
      user.userID,
      verification.authenticationInfo.newCounter,
    );

    // Generate a new JWT token for the user
    const payload = { email: user.userEmail, sub: user.userID };
    const token = this.createToken(payload);

    return { user, token };
  }
}

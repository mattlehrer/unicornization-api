import { IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from 'src/shared/decorators/is-strong-password.decorator';

export class AuthCredentialsDto {
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  username: string;

  @IsStrongPassword()
  password: string;
}

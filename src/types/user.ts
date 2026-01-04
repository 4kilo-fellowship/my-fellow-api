// type safety for signing-up
export interface SignUpDTO {
  fullName: string;
  phoneNumber: string;
  team?: string | null;
  department?: string | null;
  yearOfStudy?: number | null;
  telegramUserName?: string | null;
  password: string;
  confirmPassword?: string;
}
// type safety for signing-in

export interface SignInDTO {
  phoneNumber: string;
  password: string;
}

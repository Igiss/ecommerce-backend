import { ValidationOptions, Matches } from 'class-validator';

const VIETNAM_PHONE_REGEX = /^(?:\+84|84|0)(?:3|5|7|8|9)\d{8}$/;

export function IsVietnamPhone(validationOptions?: ValidationOptions) {
  return Matches(VIETNAM_PHONE_REGEX, {
    message: 'phone must be a valid Vietnamese phone number',
    ...validationOptions,
  });
}

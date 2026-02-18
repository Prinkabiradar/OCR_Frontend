import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

//Max length
export function noSpecialCharsValidator(maxLength: number): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;

    // Check if value exists and is not empty
    if (!value) {
      return null;
    }

    // Check for special characters using regex (allowing only alphanumeric characters and spaces)
    const specialCharsRegex = /[^a-zA-Z0-9\s]/g;
    const hasSpecialChars = specialCharsRegex.test(value);

    // Check for length
    const exceedsLength = value.length > maxLength;

    if (hasSpecialChars && exceedsLength) {
      return { specialChars: true, maxLength: true };
    } else if (hasSpecialChars) {
      return { specialChars: true };
    } else if (exceedsLength) {
      return { maxLength: true };
    }

    return null;
  };
}

//hypen
export function hyphensValidator(maxLength: number): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const value = control.value;

    // Check if value exists and is not empty
    if (!value) {
      return null;
    }

    // Check for special characters using regex (allowing only alphanumeric characters and spaces)
    const specialCharsRegex = /[^a-zA-Z0-9\s-]/g;
    const hasSpecialChars = specialCharsRegex.test(value);

    // Check for length
    const exceedsLength = value.length > maxLength;

    if (hasSpecialChars && exceedsLength) {
      return { specialChars: true, maxLength: true };
    } else if (hasSpecialChars) {
      return { specialChars: true };
    } else if (exceedsLength) {
      return { maxLength: true };
    }

    return null;
  };
}

// Email
export function customEmailValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const email = control.value as string;
    if (!email) return null; // If empty, let 'required' validator handle it

    // Check if '@' is present
    if (!email.includes('@')) {
      return { missingAtSymbol: true };
    }

    // Validate domain (should contain at least one dot after '@' and not end with '.')
    const parts = email.split('@');
    if (
      parts.length !== 2 ||
      !parts[1].includes('.') ||
      parts[1].endsWith('.')
    ) {
      return { invalidDomain: true };
    }

    return null; // No errors
  };
}
// Pan Card
export function customPanValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const pan = control.value as string;
    if (!pan) return null; // If empty, let 'required' validator handle it

    // PAN Card format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

    if (!panRegex.test(pan)) {
      return { invalidPan: true };
    }

    return null; // No errors
  };
}
//TAN Number
export function customTanValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const tan = control.value as string;
    if (!tan) return null; // If empty, let 'required' validator handle it

    // TAN format: 4 letters + 5 digits + 1 letter (e.g., ABCD12345E)
    const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;

    if (!tanRegex.test(tan)) {
      return { invalidTan: true };
    }

    return null; // No errors
  };
}
//CIN Number
export function customCinValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const cin = control.value as string;
    if (!cin) return null; // If empty, let 'required' validator handle it

    // CIN format: L99999AA9999XXX999999 (21 characters)
    const cinRegex = /^[LUF][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;

    if (!cinRegex.test(cin)) {
      return { invalidCin: true };
    }

    return null; // No errors
  };
}
//IFSC Number
export function customIfscValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const ifsc = control.value as string;
    if (!ifsc) return null; // If empty, let 'required' validator handle it

    // IFSC format: 4 letters + 0 + 6 alphanumeric (total 11 characters)
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!ifscRegex.test(ifsc)) {
      return { invalidIfsc: true };
    }

    return null; // No errors
  };
}
// ✅ EPF Validator (7-22 characters, allows letters, numbers, and '/')
export function epfValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const epf = control.value as string;
    if (!epf) return null; // Allow required validator to handle empty case

    const epfRegex = /^[A-Z]{2}\/\d{5,7}\/\d{7}$/;
    if (!epfRegex.test(epf)) {
      return { invalidEpf: true };
    }

    return null; // No errors
  };
}

// ✅ ESIC Validator (Exactly 17 digits)
export function esicValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const esic = control.value as string;
    if (!esic) return null;

    const esicRegex = /^\d{17}$/;
    if (!esicRegex.test(esic)) {
      return { invalidEsic: true };
    }

    return null;
  };
}

// ✅ PT Validator (PT followed by 6-10 digits)
export function ptValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const pt = control.value as string;
    if (!pt) return null;

    const ptRegex = /^PT\d{6,10}$/;
    if (!ptRegex.test(pt)) {
      return { invalidPt: true };
    }

    return null;
  };
}

// ✅ LWF Validator (LWF followed by 5-10 digits)
export function lwfValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const lwf = control.value as string;
    if (!lwf) return null;

    const lwfRegex = /^LWF\d{5,10}$/;
    if (!lwfRegex.test(lwf)) {
      return { invalidLwf: true };
    }

    return null;
  };
}

// ✅ GST Validator (Format: 15 characters, alphanumeric)
export function gstValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const gst = control.value as string;
    if (!gst) return null; // Let required validator handle empty case

    const gstRegex = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
    if (!gstRegex.test(gst)) {
      return { invalidGst: true };
    }

    return null; // No errors
  };
}
// ✅ Passport Validator (Format: 1 letter + 7 digits)
export function passportValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const passport = control.value as string;
    if (!passport) return null; // Let required validator handle empty case

    const passportRegex = /^[A-Z][0-9]{7}$/;
    if (!passportRegex.test(passport)) {
      return { invalidPassport: true };
    }

    return null; // No errors
  };
}
// ✅ UAN Validator (Format: Exactly 12 digits)
export function uanValidator(): ValidatorFn {
  return (control: AbstractControl) => {
    const uan = control.value as string;
    if (!uan) return null; // Let required validator handle empty case

    const uanRegex = /^\d{12}$/;
    if (!uanRegex.test(uan)) {
      return { invalidUan: true };
    }

    return null; // No errors
  };
}
export function gstinValidator(): ValidatorFn {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    return gstinRegex.test(value) ? null : { invalidGstin: true };
  };
}
export function panValidator(): ValidatorFn {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i;

  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    return panRegex.test(value) ? null : { invalidPan: true };
  };
}
export function onlyAlphabetsValidator(maxLength: number): ValidatorFn {
  return (control: AbstractControl) => {
    const value = control.value;
    if (value && !/^[A-Za-z ]+$/.test(value)) {
      return { onlyAlphabets: true }; // Return error if value contains numbers or special characters
    }
    if (value && value.length > maxLength) {
      return { maxLength: true }; // Return error if value exceeds max length
    }
    return null; // Valid input
  };
}

export function capitalLetterValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    const valid = /^[A-Z]+$/.test(control.value);
    return valid ? null : { invalidPrefixCode: true };
  };
}

export function postalCodeValidator(): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => {
    if (!control.value) return null; // Allow empty values (handled by 'required' separately)

    const valid = /^[0-9]+$/.test(control.value.trim()); // Ensure only numbers
    return valid ? null : { invalidPostalCode: true };
  };
}

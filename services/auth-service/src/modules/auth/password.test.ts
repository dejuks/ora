
import {
    hashPassword,
    verifyPassword,
} from "./password.service.js";

async function testPasswordService() {
    const password = "OraTestPassword2026!";

    // Generate hash
    const passwordHash = await hashPassword(password);

    console.log("Hash generated:", passwordHash.startsWith("$argon2id$"));

    // Correct password
    const correctPassword = await verifyPassword(
        password,
        passwordHash
    );

    console.log("Correct password:", correctPassword);

    // Incorrect password
    const incorrectPassword = await verifyPassword(
        "WrongPassword2026!",
        passwordHash
    );

    console.log("Incorrect password:", incorrectPassword);

    if (
        !passwordHash.startsWith("$argon2id$") ||
        !correctPassword ||
        incorrectPassword
    ) {
        throw new Error("Password service test failed.");
    }

    console.log("All password service tests passed.");
}

testPasswordService().catch((error) => {
    console.error(error);
    process.exit(1);
});

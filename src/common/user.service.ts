import { Injectable } from "@nestjs/common";

import UserServiceClient from "src/common/user-service-client";

@Injectable()
export class UserService {
    async verifyUserSession(session: string, username: string, browserUserAgent: string): Promise<boolean> {
        if (!session || !username || !browserUserAgent) {
            return false;
        }
        const response = await UserServiceClient.verifySession(session, username, browserUserAgent);
        return response?.isSuccessful;
    }
}

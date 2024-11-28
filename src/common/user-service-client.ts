import { ConfigService } from "@nestjs/config";
import axios, { AxiosInstance } from "axios";

type VerifySessionResponse = {
    errorCode: string;
    message: string;
    isSuccessful: boolean;
    isUM: boolean;
    umInfo: any;
};
export class UserServiceClient {
    private static instance: AxiosInstance;

    public static init(configService: ConfigService): AxiosInstance {
        if (!this.instance) {
            this.instance = axios.create({
                baseURL: configService.get<string>("userServiceUrl"),
            });
        }
        return this.instance;
    }

    public static async verifySession(session: string, username: string, browserUserAgent: string) {
        if (!this.instance) {
            return null;
        }
        const request = {
            session,
            username,
            browserUserAgent,
        };
        const path = "/auth/session/verify";
        const response = await this.instance.post<VerifySessionResponse>(path, request);

        return response?.data;
    }
}
export default UserServiceClient;

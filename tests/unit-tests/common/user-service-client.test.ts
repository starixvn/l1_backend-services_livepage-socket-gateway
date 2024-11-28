import axios from "axios";
import UserServiceClient from "../../../src/common/user-service-client";

jest.mock("axios");
describe(UserServiceClient.name, () => {
    describe("init", () => {
        it("should init instance", () => {
            // arrange
            const configsService = { get: jest.fn().mockReturnValueOnce("http://user-service") };
            const expected = {};
            axios.create = jest.fn().mockReturnValueOnce(expected);

            // act
            UserServiceClient.init(configsService as any);

            // assert
            expect(configsService.get).toHaveBeenCalledWith("userServiceUrl");
            expect(axios.create).toHaveBeenCalledWith({ baseURL: "http://user-service" });
            expect(UserServiceClient["instance"]).toEqual(expected);
        });
    });

    describe("verifySession", () => {
        describe("not exist instance", () => {
            it("should return null", async () => {
                // arrange
                UserServiceClient["instance"] = undefined;

                // act
                const actual = await UserServiceClient.verifySession("asd", "user", "browser");

                // assert
                expect(actual).toBeNull();
            });
        });

        describe("exist instance", () => {
            it("should return data from user service", async () => {
                // arrange
                const response = { data: { isSuccessful: true } };
                const request = { session: "asd", username: "user", browserUserAgent: "browser" };
                const instance = { post: jest.fn().mockReturnValueOnce(response) } as any;
                UserServiceClient["instance"] = instance;

                // act
                const actual = await UserServiceClient.verifySession(request.session, request.username, request.browserUserAgent);

                // assert
                expect(instance.post).toHaveBeenCalledWith("/auth/session/verify", request);
                expect(actual).toEqual(response.data);
            });
        });
    });
});

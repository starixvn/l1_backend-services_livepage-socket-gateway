import UserServiceClient from "../../../src/common/user-service-client";
import { UserService } from "../../../src/common/user.service";

jest.mock("../../../src/common/user-service-client");

describe("UserService", () => {
    let userService: UserService;
    beforeAll(() => {
        userService = new UserService();
    });
    describe("verifyUserSession", () => {
        const session = "session";
        const username = "username";
        const browserUserAgent = "browserUserAgent";

        describe("invalid data", () => {
            it("should return false when not exist session", async () => {
                // act
                const actual = await userService.verifyUserSession("", username, browserUserAgent);

                // assert
                expect(actual).toBeFalsy();
            });

            it("should return false when not exist username", async () => {
                // act
                const actual = await userService.verifyUserSession(session, "", browserUserAgent);

                // assert
                expect(actual).toBeFalsy();
            });

            it("should return false when not exist browserUserAgent", async () => {
                // act
                const actual = await userService.verifyUserSession(session, username, "");

                // assert
                expect(actual).toBeFalsy();
            });
        });

        describe("valid data", () => {
            it("should return result from UserServiceClient.verifySession", async () => {
                // arrange
                UserServiceClient.verifySession = jest.fn().mockReturnValueOnce({ isSuccessful: true });

                // act
                const actual = await userService.verifyUserSession(session, username, browserUserAgent);

                // assert
                expect(UserServiceClient.verifySession).toHaveBeenCalledWith(session, username, browserUserAgent);
                expect(actual).toBeTruthy();
            });
        });
    });
});

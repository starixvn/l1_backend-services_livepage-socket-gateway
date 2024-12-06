import * as nock from "nock";

const actions = {
    verifySession: "/auth/session/verify",
};

export const initUserServiceAPI = (userServiceUrl) => {
    nock(userServiceUrl)
        .persist()
        .post(actions.verifySession, /invalid+/gi)
        .reply(200, { isSuccessful: false })
        .post(actions.verifySession, () => true)
        .reply(200, { isSuccessful: true });
};

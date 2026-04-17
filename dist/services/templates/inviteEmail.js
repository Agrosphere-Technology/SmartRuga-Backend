"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inviteEmailTemplate = inviteEmailTemplate;
function inviteEmailTemplate(ranchName, inviteUrl) {
    return {
        subject: `You were invited to join ${ranchName} on SmartRUGA`,
        html: `
      <h2>SmartRUGA Ranch Invitation</h2>
      <p>You have been invited to join the ranch <b>${ranchName}</b>.</p>

      <p>Click the link below to accept the invite:</p>

      <p>
        <a href="${inviteUrl}" target="_blank">
          Accept Invite
        </a>
      </p>

      <p>If you did not expect this invite, ignore this email.</p>

      <br/>
      <p>— SmartRUGA</p>
    `,
    };
}

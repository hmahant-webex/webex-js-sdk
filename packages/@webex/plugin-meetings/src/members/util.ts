import uuid from 'uuid';
import {
  HTTP_VERBS,
  CONTROLS,
  _FORCED_,
  LEAVE,
  PARTICIPANT,
  VALID_EMAIL_ADDRESS,
  DIALER_REGEX,
  SEND_DTMF_ENDPOINT,
  _REMOVE_,
  ALIAS,
} from '../constants';

import {RoleAssignmentOptions, RoleAssignmentRequest, ServerRoleShape} from './types';

const MembersUtil = {
  /**
   * @param {Object} invitee with emailAddress, email or phoneNumber
   * @param {String} locusUrl
   * @param {Boolean} alertIfActive
   * @returns {Object} the format object
   */
  generateAddMemberOptions: (invitee: object, locusUrl: string, alertIfActive: boolean) => ({
    invitee,
    locusUrl,
    alertIfActive,
  }),

  /**
   * @param {Array} memberIds
   * @param {String} locusUrl
   * @returns {Object} the format object
   */
  generateAdmitMemberOptions: (memberIds: Array<any>, locusUrl: string) => ({
    locusUrl,
    memberIds,
  }),

  /**
   * @param {Object} options with {invitee: {emailAddress, email, phoneNumber}, alertIfActive}
   * @returns {Object} with {invitees: [{address}], alertIfActive}
   */
  getAddMemberBody: (options: any) => ({
    invitees: [
      {
        address:
          options.invitee.emailAddress || options.invitee.email || options.invitee.phoneNumber,
      },
    ],
    alertIfActive: options.alertIfActive,
  }),

  /**
   * @param {Object} options with {memberIds, authorizingLocusUrl}
   * @returns {Object} admit with {memberIds}
   */
  getAdmitMemberRequestBody: (options: any) => {
    const {memberIds, sessionLocusUrls} = options;
    const body: any = {admit: {participantIds: memberIds}};
    if (sessionLocusUrls) {
      const {authorizingLocusUrl} = sessionLocusUrls;

      return {authorizingLocusUrl, ...body};
    }

    return body;
  },

  /**
   * @param {Object} format with {memberIds, locusUrl, sessionLocusUrls}
   * @returns {Object} the request parameters (method, uri, body) needed to make a admitMember request
   * if a host/cohost is in a breakout session, the locus url should be the main session locus url
   */
  getAdmitMemberRequestParams: (format: any) => {
    const body = MembersUtil.getAdmitMemberRequestBody(format);
    const {locusUrl, sessionLocusUrls} = format;
    const baseUrl = sessionLocusUrls?.mainLocusUrl || locusUrl;
    const uri = `${baseUrl}/${CONTROLS}`;

    return {
      method: HTTP_VERBS.PUT,
      uri,
      body,
    };
  },

  /**
   * @param {Object} format with {invitee {emailAddress, email, phoneNumber}, locusUrl, alertIfActive}
   * @returns {Object} the request parameters (method, uri, body) needed to make a addMember request
   */
  getAddMemberRequestParams: (format: any) => {
    const body = MembersUtil.getAddMemberBody(format);
    const requestParams = {
      method: HTTP_VERBS.PUT,
      uri: format.locusUrl,
      body,
    };

    return requestParams;
  },

  isInvalidInvitee: (invitee) => {
    if (!(invitee && (invitee.email || invitee.emailAddress || invitee.phoneNumber))) {
      return true;
    }

    if (invitee.phoneNumber) {
      return !DIALER_REGEX.E164_FORMAT.test(invitee.phoneNumber);
    }

    return !VALID_EMAIL_ADDRESS.test(invitee.email || invitee.emailAddress);
  },

  getRemoveMemberRequestParams: (options) => {
    const body = {
      reason: options.reason,
    };
    const uri = `${options.locusUrl}/${PARTICIPANT}/${options.memberId}/${LEAVE}`;

    return {
      method: HTTP_VERBS.PUT,
      uri,
      body,
    };
  },

  generateTransferHostMemberOptions: (transfer, moderator, locusUrl) => ({
    moderator,
    locusUrl,
    memberId: transfer,
  }),

  generateRemoveMemberOptions: (removal, locusUrl) => ({
    reason: _FORCED_,
    memberId: removal,
    locusUrl,
  }),

  generateMuteMemberOptions: (memberId, status, locusUrl, isAudio) => ({
    memberId,
    muted: status,
    locusUrl,
    isAudio,
  }),

  generateRaiseHandMemberOptions: (memberId, status, locusUrl) => ({
    memberId,
    raised: status,
    locusUrl,
  }),

  /**
   * @param {String} memberId
   * @param {[ServerRoleShape]} roles
   * @param {String} locusUrl
   * @returns {RoleAssignmentOptions}
   */
  generateRoleAssignmentMemberOptions: (
    memberId: string,
    roles: Array<ServerRoleShape>,
    locusUrl: string
  ): RoleAssignmentOptions => ({
    memberId,
    roles,
    locusUrl,
  }),

  generateLowerAllHandsMemberOptions: (requestingParticipantId, locusUrl, roles) => ({
    requestingParticipantId,
    locusUrl,
    ...(roles !== undefined && {roles}),
  }),

  /**
   * @param {String} memberId id of the participant who is receiving request
   * @param {String} requestingParticipantId id of the participant who is sending request (optional)
   * @param {String} alias alias name
   * @param {String} locusUrl url
   * @returns {Object} consists of {memberID: string, requestingParticipantId: string, alias: string, locusUrl: string}
   */
  generateEditDisplayNameMemberOptions: (memberId, requestingParticipantId, alias, locusUrl) => ({
    memberId,
    requestingParticipantId,
    alias,
    locusUrl,
  }),

  getMuteMemberRequestParams: (options) => {
    const property = options.isAudio === false ? 'video' : 'audio';
    const body = {
      [property]: {
        muted: options.muted,
      },
    };
    const uri = `${options.locusUrl}/${PARTICIPANT}/${options.memberId}/${CONTROLS}`;

    return {
      method: HTTP_VERBS.PATCH,
      uri,
      body,
    };
  },

  /**
   * @param {ServerRoleShape} role
   * @returns {ServerRoleShape} the role shape to be added to the body
   */
  getAddedRoleShape: (role: ServerRoleShape): ServerRoleShape => {
    const roleShape: ServerRoleShape = {type: role.type, hasRole: role.hasRole};

    if (role.hostKey) {
      roleShape.hostKey = role.hostKey;
    }

    return roleShape;
  },

  /**
   * @param {RoleAssignmentOptions} options
   * @returns {RoleAssignmentRequest} the request parameters (method, uri, body) needed to make a addMember request
   */
  getRoleAssignmentMemberRequestParams: (options: RoleAssignmentOptions): RoleAssignmentRequest => {
    const body = {role: {roles: []}};
    options.roles.forEach((role) => {
      body.role.roles.push(MembersUtil.getAddedRoleShape(role));
    });

    const uri = `${options.locusUrl}/${PARTICIPANT}/${options.memberId}/${CONTROLS}`;

    return {
      method: HTTP_VERBS.PATCH,
      uri,
      body,
    };
  },

  getRaiseHandMemberRequestParams: (options) => {
    const body = {
      hand: {
        raised: options.raised,
      },
    };
    const uri = `${options.locusUrl}/${PARTICIPANT}/${options.memberId}/${CONTROLS}`;

    return {
      method: HTTP_VERBS.PATCH,
      uri,
      body,
    };
  },

  getLowerAllHandsMemberRequestParams: (options) => {
    const body = {
      hand: {
        raised: false,
        ...(options.roles !== undefined && {roles: options.roles}),
      },
      requestingParticipantId: options.requestingParticipantId,
    };
    const uri = `${options.locusUrl}/${CONTROLS}`;

    return {
      method: HTTP_VERBS.PATCH,
      uri,
      body,
    };
  },

  /**
   * @param {Object} options with format of {locusUrl: string, requestingParticipantId: string}
   * @returns {Object} request parameters (method, uri, body) needed to make a editDisplayName request
   */
  editDisplayNameMemberRequestParams: (options) => {
    const body = {
      aliasValue: options.alias,
      requestingParticipantId: options.requestingParticipantId,
    };
    const uri = `${options.locusUrl}/${PARTICIPANT}/${options.memberId}/${ALIAS}`;

    return {
      method: HTTP_VERBS.POST,
      uri,
      body,
    };
  },

  getTransferHostToMemberRequestParams: (options) => {
    const body = {
      role: {
        moderator: options.moderator,
      },
    };
    const uri = `${options.locusUrl}/${PARTICIPANT}/${options.memberId}/${CONTROLS}`;

    return {
      method: HTTP_VERBS.PATCH,
      uri,
      body,
    };
  },

  genderateSendDTMFOptions: (url, tones, memberId, locusUrl) => ({
    url,
    tones,
    memberId,
    locusUrl,
  }),

  generateSendDTMFRequestParams: ({url, tones, memberId, locusUrl}) => {
    const body = {
      device: {
        url,
      },
      memberId,
      dtmf: {
        correlationId: uuid.v4(),
        tones,
        direction: 'transmit',
      },
    };
    const uri = `${locusUrl}/${PARTICIPANT}/${memberId}/${SEND_DTMF_ENDPOINT}`;

    return {
      method: HTTP_VERBS.POST,
      uri,
      body,
    };
  },

  cancelPhoneInviteOptions: (invitee, locusUrl) => ({
    invitee,
    locusUrl,
  }),

  generateCancelInviteRequestParams: (options) => {
    const body = {
      actionType: _REMOVE_,
      invitees: [
        {
          address: options.invitee.phoneNumber,
        },
      ],
    };
    const requestParams = {
      method: HTTP_VERBS.PUT,
      uri: options.locusUrl,
      body,
    };

    return requestParams;
  },
};

export default MembersUtil;

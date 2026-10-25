# STOP checkpoint — 24 October 2026, America/Chicago

User explicitly requested all work/processes stopped because credits are running out; log and complete handoff only. Resume only on a new user instruction. No final readiness claim. Both specialist chats sent STOP; local COHUE production test servers3100/3101 and older Claude dev3300/localworker terminated. Dedicated local test PostgreSQL54329 also received graceful SIGTERM shutdown; its stored test data is preserved. Production Vercel website intentionally left available; Vultr cohue-worker remains confirmed INACTIVE (normal systemctlstop at2026-10-25T04:03:45Z). Service boot-enabled; a host reboot could restart its old source. Do not assume host itself is powered off or billing stopped. No new host/addons purchased.

## Source and implemented work

Shared main includes frontend focus/draft continuity fixes809db4f/192c2b6, privacy/source cleanup f4952f6, real local multilingual acceptance13822b3 and guarded on-host acceptance harness95dfaa7. Last remotely pushed lead orchestration baseline8385a34; later local release commits have not been pushed/deployed by lead. Use git log/status to discover any final specialist STOP-note commits appended afterward. Do not reset/revert or stage others' changes blindly. DesignSystem1.0 frozen/unchanged; shared39APIoperations include creator-onlyreview, existinginvite-onlyaccess unchanged.

Lead-owned .env.example adds EVENT_RETENTION_READY=0 and RETENTION_ROLLOUT_GATE.md documents rollout; these are saved with this STOP checkpoint. No secret values committed. Existing ignoredcredentials contain dedicated administration key/trustedknownhosts; bootstrap password/transient transfers were removed by backend. Do not recreate/reset credentials or create duplicateVultr/Tigerresources.

## Exact production database transition — CRITICAL

Local direct PostgreSQL35959 andSSH22 began timingout; bounded diagnostic alsofailed. No security/firewall/TLS bypass. Original npm db:migrate failed ETIMEDOUT before applying0002. Lead used authenticated TigerData HTTPS SQLeditor on existing cohue-prod/rje03je7u3 to execute reviewed0002 in BEGIN/COMMIT with10slocktimeout, GRANT SELECT,INSERT,DELETE on public.privacy_audit to cohue_app, and migrationledger insert. Console returnedSUCCESS and3rows:0000_init.sql,0001_mission_history.sql,0002_privacy_retention.sql. Thus0002 IS APPLIED andgrantstatementexecuted; do NOT blindlyrerunDDL. Actual least-privilege runtime-role transaction/rollback/trigger probe is NOT YET RUN. No admin credential transferred toVultr. Triggerbridge supports oldMAX-basedwriters while pruningoff; do not enablepruninguntilallwriterscompatible.

Vercel still runs previously published compatibleoldproductcode, notlocalprivacyrelease. Vultrworker source remains8385a347d96eb0c0bca6abefd936fdbb9453f90b andstopped. EVENT_RETENTION_READY hasNOTbeenenabledonproductionweb/worker. No finalreleasearchiveupdate/start ornewD7/privacyproductionproof executed. Do not enableeventpruningthenroll backtoMAX-onlywriters.

## Verified evidence at this stop

- Combinedcheck on privacy/frontendintegratedsource passed97tests/17files/0skips withactualisolatedPostgreSQL, lint/typecheck/productionbuild/frozenhashes. Backendreported26actualDBtests/7files/0skips. Audit0vulnerabilities.
- Root coreAPIintegration rerun onfreshseparatecohue_release_api afterall3migrations:6passed4.9s, includingI2,capacityrace,repair/reconsent/activation,SHOWCASE. InitialsharedDBSHOWCASEtestpausedbecausefrontendUIheldfixturecapacity; movedAPItests toseparatedatabase, didnotresetfrontenddata.
- Frontend actualfreshlocalCUA:1024joinoverflowfixed; composer320/390/768/1024/1440fits;44pxtarget/24pxvisualcheckboxSpace+focuspass; creatorrevieworiginalterms andnoresponsecontrols; Escapeexacttriggerfocus; editedSpanishdraft/dialogsurvives390/1024/1440/768. RealSpanish/Frenchtranslationreview/approval preservedparticipantconsent1/4. Actualen/es/frTTSplayed DOMreadyState4/noerror; nothumanlistening/physicalmicproof. Ownsyntheticlocalmissioncancellednormally. Evidence in frontendFRESH_REVIEW_ACCEPTANCE/status/screenshots. Notfinaldeployedproof.
- Prior actualD7PASSED for8385a34 only: unattendedprogress/SIGKILL/autorestart/natural30slease/fence2/stalewriterejection/ordered23events/singleactivation/uniqueeffects. docs/operations/D7_EVIDENCE.md andsafeJSONretainexacttrace. Notproofthatnewprivacy/eventcounterreleasewasdeployed/tested.
- EarlierhostedCI green through796042e, notnewlocalrelease. No hostednewreleaseCIrun inferredfromlocalpasses.

## Remaining mandatory work / next resume order

1. Read AGENTS,BOTHhandoffs, RELEASE_ORCHESTRATION andspecialistscopes/status; getGit/remote/deployment/workeridentitywithoutsecretoutput. ConfirmSTOPrevokedbyuserbeforework.
2. Establishboundedsecureaccess: localhighportegressmaystillfail; authenticatedVultrrootconsole canfetchreviewedpublicGitarchiveviaHTTPS, TigerSQLeditor works. No securityrelaxation/admincredentialonworker. BackendguardedharnessCOHUE_D7_ON_HOST=1 allowsruntime-env-onlyproofonexistinghost; preparedprivacy-smokescriptnewrandomSHOWCASEonly.
3. Verifyactualruntimecohue_approleauditSELECT/INSERT/DELETE+countertriggerinROLLBACK viaTigerSQLeditorSETLOCALROLE ortrustedruntimeconnection. Confirm0002ledger/bridgeexists; noDDLrerun.
4. ReviewremainingBRIEFgapBEFOREclaimcomplete: synthesize explicitlyrejectsBRIEF andMissionRoombriefs currently[]; backendproposed existingcontract-based canonicalmissionbrief/localization/review/TTS withcreator/memberauth+sourcehash/version+privacycleanup, butNOTIMPLEMENTED. CoordinatefrontendRoomconsumer, noadhocschemas. Thismandatoryscopecannotbesilentlycalleddone.
5. Serializefinalcheck/audit/actualDB/API/browser/E2E; runauthoredcreatorreview/focus/draftE2E inhostedCI. Rootownsbuild/.next; don'tconcurrentbuild. Pushreviewedreleaseonlyafterchecks, verifyVercelReady/source/HTTPS. UpdateexistingVultr tosameexactcompatiblecommit/runtimeenvandstartservice; noadmincredentials.
6. Verifyallwriteridentities, enableEVENT_RETENTION_READY=1onbothruntimeswithfreshdeployment/restart, thenrerunfinalsourceD7quietproof andproductionSHOWCASEprivacy/sweeperproof. Preserveold8385trace; noHTTP/after()contamination. FullproviderSTT/extraction/translationapproval/playback en/es/fr andtwo-sessioncoreflowonfinaldeploymentstillrequired.
7. Physicalphone/screenreader/reducedmotion/privateviewport/graphprofilingacceptance remainsincompletewhereexplicitlyuntested. Demo/video/Devpostrequirements/deadlineverification/submissionwindowremainprotected; noautomaticpublicsubmissionauthorizationimplied. Neverclaimflawlessfromcodepresence.

Stop state: partial rollout safely held, webavailable, workerINACTIVE, migrationappliedbutruntimeprobe/newdeploymentpending. Keep this distinction prominent on resume.

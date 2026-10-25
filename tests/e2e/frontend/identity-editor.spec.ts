import { test, expect } from "@playwright/test";
import { apiContracts } from "@/contracts";
import { MockBackend } from "./support/mock-backend";
import { participants, fixtureId, scope } from "./support/mock-data";
const base=process.env.COHUE_FRONTEND_BASE_URL??"";
test("existing profile identity saves through versioned profile update",async({page})=>{
 const mock=new MockBackend();mock.session={principalId:fixtureId(990),kind:"GUEST",scope,invitationId:null,expiresAt:"2026-12-01T00:00:00Z"};await mock.install(page);
 await page.addInitScript(({principal,id})=>localStorage.setItem(`cohue.device.v2:LIVE:${principal}`,JSON.stringify({participantId:id,missions:[]})),{principal:fixtureId(990),id:participants[0].id});
 let input:Record<string,unknown>|null=null;
 await page.route(`**/api/participants/${participants[0].id}`,r=>{if(r.request().method()!=="PATCH")return r.fallback();input=r.request().postDataJSON();const profile=input!.profile as object;return r.fulfill({status:200,json:apiContracts.updateParticipant.response.parse({data:{...participants[0],...profile,profileVersion:2},correlationId:fixtureId(900)})})});
 await page.goto(`${base}/me`);await page.getByRole('button',{name:'Choose username & avatar'}).click();
 const dialog=page.getByRole('dialog',{name:'Make your space yours.'});await dialog.getByLabel('Username',{exact:true}).fill('river_23');await dialog.getByRole('button',{name:'Avatar 3',exact:true}).click();await dialog.getByRole('button',{name:'Save identity',exact:true}).click();await expect(dialog).toHaveCount(0);await expect(page.getByText('@river_23',{exact:true})).toBeVisible();expect(input).toMatchObject({expectedVersion:1,profile:{username:'river_23',avatarId:'3d_3'}});
});

import { expect, it } from "vitest";
import { UsernameSchema, AvatarIdSchema, ProfileInputSchema } from "@/contracts";
it("normalizes username and restricts format and avatar source",()=>{
 expect(UsernameSchema.parse("  River_23 ")).toBe("river_23");
 for(const value of ["ab","123name","a name","a<script>","a".repeat(25)]) expect(UsernameSchema.safeParse(value).success).toBe(false);
 expect(AvatarIdSchema.safeParse("../../private").success).toBe(false);
 expect(AvatarIdSchema.parse("3d_3")).toBe("3d_3");
});
it("keeps older profiles readable without inventing chosen identity",()=>{
 const p=ProfileInputSchema.parse({displayName:"Existing person",language:"en",needs:[],interests:[],availability:[],capabilities:[],visibility:{publicGraph:false,discoverable:false},participationOptIn:false});
 expect(p.username).toBeNull();expect(p.avatarId).toBeNull();
});

"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AvatarIdSchema, UsernameSchema, type Participant } from "@/contracts";
import { keys } from "@/client/queries";
import { useCommand } from "@/client/command";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Field, TextInput } from "@/components/ui/field";
import { ErrorNotice, Notice } from "@/components/ui/notice";

export function IdentityEditor({ participant }: {participant:Participant}) {
 const [open,setOpen]=useState(false);const trigger=useRef<HTMLButtonElement>(null);
 return <><Button ref={trigger} size="sm" className="mb-5" onClick={()=>setOpen(true)}>{participant.username ? "Edit your identity" : "Choose username & avatar"}</Button><Sheet open={open} onOpenChange={setOpen} title="Make your space yours." description="Choose the name and avatar people recognize across COHUE." className="participant-sheet" subtle returnFocusRef={trigger}>{open ? <IdentityForm key={participant.profileVersion} participant={participant} onSaved={()=>setOpen(false)}/> : null}</Sheet></>;
}
function IdentityForm({participant,onSaved}:{participant:Participant;onSaved:()=>void}) {
 const [username,setUsername]=useState(participant.username??"");const [name,setName]=useState(participant.displayName);const [avatar,setAvatar]=useState(participant.avatarId??"3d_1");const [invalid,setInvalid]=useState(false);
 const update=useCommand("updateParticipant");const client=useQueryClient();
 const save=()=>{if(!UsernameSchema.safeParse(username).success||!name.trim()){setInvalid(true);return;}const {id,profileVersion,scope,createdAt,...profile}=participant;void scope;void createdAt;update.mutate({params:{id},input:{expectedVersion:profileVersion,profile:{...profile,displayName:name.trim(),username,avatarId:avatar}}},{onSuccess:next=>{client.setQueryData(keys.participant(id),next);onSaved();}})};
 return <div className="flex flex-col gap-5"><Field label="Display name" error={invalid&&!name.trim()?"Enter the name people will see.":undefined}>{f=><TextInput id={f.id} value={name} onChange={e=>setName(e.target.value)} maxLength={120}/>}</Field><Field label="Username" helper="3–24 letters, numbers or underscores, starting with a letter." error={invalid&&!UsernameSchema.safeParse(username).success?"Choose a valid username.":undefined}>{f=><TextInput id={f.id} value={username} onChange={e=>setUsername(e.target.value.toLowerCase())} autoComplete="username" maxLength={24}/>}</Field><fieldset className="avatar-picker"><legend>Your avatar</legend><div>{AvatarIdSchema.options.map((id,i)=><button type="button" key={id} aria-pressed={avatar===id} aria-label={`Avatar ${i+1}`} onClick={()=>setAvatar(id)}><Image src={`/avatars/${id}.png`} width={64} height={64} alt=""/></button>)}</div></fieldset><Notice>Changing your name or avatar does not change your skills, availability, visibility or invitation decisions.</Notice>{update.isError?<ErrorNotice error={update.error}/>:null}<Button variant="primary" onClick={save} pending={update.isPending} pendingLabel="Saving identity…">Save identity</Button></div>;
}

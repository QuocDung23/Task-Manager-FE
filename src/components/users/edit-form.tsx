import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";

interface EditFormProps {
  formData: {
    name: string;
    bio: string;
    address: string;
    phoneNumber: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      bio: string;
      address: string;
      phoneNumber: string;
    }>
  >;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function EditForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  isSaving,
}: EditFormProps) {
  const fieldClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm transition-colors focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 focus-visible:outline-none";
  const labelClass =
    "mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className={labelClass}>Display Name</label>
        <input
          className={fieldClass}
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          placeholder="Your name"
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Address</label>
        <input
          className={fieldClass}
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
          placeholder="Where do you live?"
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Phone Number</label>
        <input
          className={fieldClass}
          value={formData.phoneNumber}
          onChange={(e) =>
            setFormData({ ...formData, phoneNumber: e.target.value })
          }
          placeholder="+1 234 567 890"
          type="tel"
        />
      </div>

      <div className="space-y-1.5">
        <label className={labelClass}>Bio</label>
        <Textarea
          className="min-h-20 resize-none"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          placeholder="Tell us about yourself..."
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving}>
          {isSaving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

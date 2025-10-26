// Handler functions for section editing
export const createSectionHandlers = (
  onUpdateMember: (updates: any) => Promise<void>,
  setIsSavingSection: (saving: boolean) => void
) => {
  const handleSavePersonal = async (editedPersonal: any, setIsEditing: (editing: boolean) => void) => {
    setIsSavingSection(true);
    try {
      await onUpdateMember(editedPersonal);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save personal information:', error);
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleSaveHealth = async (editedHealth: any, setIsEditing: (editing: boolean) => void) => {
    setIsSavingSection(true);
    try {
      await onUpdateMember(editedHealth);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save health information:', error);
    } finally {
      setIsSavingSection(false);
    }
  };

  const handleSaveEmergency = async (editedEmergency: any, setIsEditing: (editing: boolean) => void) => {
    setIsSavingSection(true);
    try {
      await onUpdateMember(editedEmergency);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save emergency contact:', error);
    } finally {
      setIsSavingSection(false);
    }
  };

  return { handleSavePersonal, handleSaveHealth, handleSaveEmergency };
};

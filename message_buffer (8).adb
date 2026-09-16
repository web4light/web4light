pragma SPARK_Mode (On);

package body Message_Buffer is

   procedure Add (B : in out Buffer; Text : String; Success : out Boolean) is
   begin
      if B.Count < Max_Messages and Text'Length <= Max_Text_Len then
         B.Count := B.Count + 1;
         B.Messages (B.Count).Len := Text'Length;
         B.Messages (B.Count).Text (1 .. Text'Length) := Text;
         Success := True;
      else
         Success := False;
      end if;
   end Add;

end Message_Buffer;
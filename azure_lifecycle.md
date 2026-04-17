# 💡 Guia: Autolimpeza Automática no Azure (Custo Zero)

Embora o Lumina agora delete o arquivo original da pasta `entrada` logo após a tradução, os arquivos na pasta `saida` permanecem lá para que os usuários possam baixá-los. Para evitar que seu Storage cresça indefinidamente, recomendamos configurar uma **Regra de Ciclo de Vida** no Portal do Azure.

### Passo 1: Acesse sua Storage Account
1. No [Portal do Azure](https://portal.azure.com/), vá até a sua conta de armazenamento (`applumina`).
2. No menu lateral esquerdo, sob a seção **Data management**, clique em **Lifecycle Management**.

### Passo 2: Adicione uma Regra
1. Clique em **+ Add a rule**.
2. **Rule name**: `AutoDelete7Days` (ou qualquer nome de sua preferência).
3. **Rule scope**: Selecione "Limit blobs with filters".
4. Clique em **Next**.

### Passo 3: Defina a Condição
1. Mantenha "Base blobs" selecionado.
2. Em **If Base blobs were**, selecione: `Last modified`.
3. Em **More than (days ago)**, digite: `7` (ou o número de dias que você deseja manter os arquivos).
4. Em **Then**, selecione: `Delete the blob`.
5. Clique em **Next**.

### Passo 4: Filtre por Pasta (Importante!)
1. Em **Prefix match**, adicione o caminho do container de saída:
   - `saida/`
2. Isso garante que a regra só apague arquivos que já foram traduzidos e entregues há mais de 7 dias.
3. Clique em **Add** para finalizar.

---
✅ **Pronto!** Agora o Azure cuidará da limpeza pesada para você de forma totalmente gratuita e automática.

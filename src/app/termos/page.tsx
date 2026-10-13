import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Termos de Uso",
};

export default function TermosPage() {
  return (
    <LegalPage title="Termos de Uso">
      <LegalSection n={1} title="Quem somos e o que estes termos regulam">
        <p>
          O {LEGAL.produto} (“Plataforma”) é um sistema online de gestão para
          barbearias, salões e negócios de beleza, com agenda, clientes,
          serviços, equipe, financeiro, estoque e relatórios. Ele é operado por{" "}
          {LEGAL.razaoSocial}, inscrito(a) sob o documento {LEGAL.documento},
          com sede em {LEGAL.endereco}.
        </p>
        <p>
          Ao criar uma conta ou usar a Plataforma, você concorda com estes
          Termos de Uso e com a Política de Privacidade. Se não concordar, não
          utilize a Plataforma.
        </p>
        <p>
          Neste documento, “Cliente” é a empresa que contrata a Plataforma;
          “Usuário” é qualquer pessoa que acessa a conta do Cliente
          (administradores e funcionários); e “Clientes Finais” são as pessoas
          atendidas pelo Cliente, cujos dados o Cliente cadastra na Plataforma.
        </p>
      </LegalSection>

      <LegalSection n={2} title="Cadastro e conta">
        <ul>
          <li>
            Você declara ter capacidade legal para contratar e informar dados
            verdadeiros e atualizados.
          </li>
          <li>
            Você é responsável por manter a senha em sigilo e por tudo que for
            feito com a sua conta.
          </li>
          <li>
            O administrador do Cliente decide quem entra na equipe, por meio de
            convites, e define o papel de cada pessoa (administrador ou
            funcionário). O Cliente responde pelos atos das pessoas que
            convidar.
          </li>
          <li>
            Avise-nos imediatamente se suspeitar de acesso indevido à sua conta.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Uso permitido">
        <p>
          Você se compromete a usar a Plataforma apenas para fins lícitos e
          relacionados à gestão do seu negócio. É proibido:
        </p>
        <ul>
          <li>
            tentar acessar dados de outras empresas ou contornar controles de
            acesso e de segurança;
          </li>
          <li>
            copiar, descompilar, revender ou fazer engenharia reversa do
            sistema;
          </li>
          <li>
            sobrecarregar a infraestrutura, inserir código malicioso ou usar a
            Plataforma para spam;
          </li>
          <li>
            cadastrar dados de terceiros sem ter base legal para isso ou
            conteúdo ilícito.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Dados dos Clientes Finais e a LGPD">
        <p>
          Os dados dos Clientes Finais (como nome, telefone, e-mail, histórico
          de atendimentos e pagamentos) pertencem ao Cliente. Em relação a eles,
          o Cliente atua como controlador e nós atuamos como operador, tratando
          os dados apenas para fornecer a Plataforma e conforme as instruções do
          Cliente.
        </p>
        <p>
          O Cliente é responsável por ter base legal para cadastrar esses dados,
          informar seus Clientes Finais sobre o tratamento e atender aos pedidos
          deles. Quando um titular nos procurar a respeito de dados que são do
          Cliente, poderemos encaminhar o pedido ao Cliente. Detalhes estão na
          Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Acesso de suporte">
        <p>
          Para dar suporte, corrigir problemas e garantir a segurança, nossa
          equipe autorizada pode acessar a conta do Cliente em um modo de
          suporte. Esse acesso é limitado a esses fins, tem duração restrita e o
          início e o fim de cada sessão ficam registrados na trilha de auditoria
          do Cliente. Não usamos esse acesso para outras finalidades.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Planos, pagamento e suspensão">
        <p>
          Preços, períodos de teste e condições de pagamento são informados no
          momento da contratação e podem ser atualizados mediante aviso prévio.
          Em caso de inadimplência ou violação destes Termos, poderemos
          suspender o acesso após aviso ao Cliente, preservando os dados pelo
          prazo previsto na seção 9.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Disponibilidade e responsabilidades">
        <ul>
          <li>
            Empregamos esforços razoáveis para manter a Plataforma disponível e
            segura, mas pode haver interrupções para manutenção, falhas de
            provedores ou eventos fora do nosso controle.
          </li>
          <li>
            A Plataforma é uma ferramenta de apoio à gestão. O Cliente é
            responsável por conferir os valores, comissões e estoques exibidos e
            por suas obrigações fiscais, trabalhistas e contábeis.
          </li>
          <li>
            Recomendamos exportar periodicamente os relatórios para manter
            cópias próprias das informações importantes.
          </li>
          <li>
            Na medida permitida pela lei, não respondemos por lucros cessantes
            ou danos indiretos, e nossa responsabilidade total fica limitada ao
            valor pago pelo Cliente nos 12 meses anteriores ao fato, sem afastar
            direitos que a legislação não permita limitar.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={8} title="Propriedade intelectual">
        <p>
          O software, a marca, o layout e a documentação da Plataforma são
          nossos ou de nossos licenciantes. Concedemos ao Cliente uma licença
          limitada, não exclusiva e intransferível para usar a Plataforma
          enquanto o contrato estiver ativo. Os dados cadastrados pelo Cliente
          continuam sendo do Cliente.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Cancelamento e exclusão dos dados">
        <ul>
          <li>
            O Cliente pode cancelar a qualquer momento, solicitando pelo e-mail{" "}
            {LEGAL.emailSuporte}.
          </li>
          <li>
            Após o cancelamento, o Cliente terá {LEGAL.diasExportacao} dias para
            exportar seus dados. Depois disso, os dados serão excluídos ou
            anonimizados em até {LEGAL.diasExclusao} dias, salvo quando a lei
            exigir guarda por mais tempo.
          </li>
          <li>
            Podemos encerrar contas que violem estes Termos, com aviso, exceto
            em casos graves ou de risco à segurança.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={10} title="Alterações destes termos">
        <p>
          Podemos atualizar estes Termos. Avisaremos pelo painel ou por e-mail
          com pelo menos {LEGAL.diasAvisoAlteracao} dias de antecedência quando
          a mudança for relevante. Continuar usando a Plataforma após esse prazo
          significa concordância com a nova versão.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Lei aplicável e foro">
        <p>
          Estes Termos são regidos pela lei brasileira. Fica eleito o foro de{" "}
          {LEGAL.foro} para resolver eventuais controvérsias, ressalvado o foro
          legal do consumidor quando aplicável.
        </p>
      </LegalSection>

      <LegalSection n={12} title="Contato">
        <p>Dúvidas sobre estes Termos: {LEGAL.emailSuporte}.</p>
      </LegalSection>
    </LegalPage>
  );
}

import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Política de Privacidade",
};

export default function PrivacidadePage() {
  return (
    <LegalPage title="Política de Privacidade">
      <LegalSection n={1} title="Quem é responsável pelos dados">
        <p>
          Esta Política explica como o {LEGAL.produto} (“Plataforma”), operado
          por {LEGAL.razaoSocial} ({LEGAL.documento}), trata dados pessoais, em
          conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018,
          LGPD).
        </p>
        <ul>
          <li>
            <strong className="text-zinc-100">
              Dados de conta e de uso da Plataforma
            </strong>{" "}
            (quem se cadastra, equipe, registros de segurança): somos o
            controlador.
          </li>
          <li>
            <strong className="text-zinc-100">Dados dos Clientes Finais</strong>{" "}
            (pessoas atendidas pelas barbearias e salões): a empresa que usa a
            Plataforma é a controladora, e nós somos o operador, tratando os
            dados apenas para prestar o serviço e conforme as instruções dela.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={2} title="Quais dados tratamos">
        <ul>
          <li>
            <strong className="text-zinc-100">Conta e equipe:</strong> e-mail,
            senha (guardada de forma protegida pelo provedor de autenticação,
            nunca em texto aberto), nome e papel (administrador ou funcionário).
          </li>
          <li>
            <strong className="text-zinc-100">Empresa:</strong> nome, telefone,
            endereço e identidade visual.
          </li>
          <li>
            <strong className="text-zinc-100">Operação do negócio:</strong>{" "}
            cadastro de clientes (nome, telefone, e-mail, observações),
            serviços, agendamentos, pagamentos, comissões, estoque e lançamentos
            de caixa. A Plataforma não coleta dados de cartão de pagamento.
          </li>
          <li>
            <strong className="text-zinc-100">Segurança:</strong> trilha de
            auditoria (quem fez o quê e quando) e notificações de eventos
            sensíveis.
          </li>
          <li>
            <strong className="text-zinc-100">Dados técnicos:</strong> cookies
            de sessão e registros de acesso mantidos pelos provedores de
            infraestrutura (por exemplo, endereço IP e data/hora).
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="Para que usamos e em que base legal">
        <ul>
          <li>
            Criar e manter sua conta e prestar o serviço contratado (execução de
            contrato).
          </li>
          <li>
            Garantir a segurança, prevenir fraudes e manter a trilha de
            auditoria (legítimo interesse e prevenção à fraude).
          </li>
          <li>
            Cumprir obrigações legais e regulatórias e exercer direitos em
            processos (obrigação legal e exercício regular de direitos).
          </li>
          <li>
            Responder pedidos de suporte e de titulares de dados (execução de
            contrato e obrigação legal).
          </li>
        </ul>
        <p>Não vendemos dados pessoais nem os usamos para publicidade.</p>
      </LegalSection>

      <LegalSection n={4} title="Com quem compartilhamos">
        <p>
          Compartilhamos dados apenas com prestadores necessários ao
          funcionamento da Plataforma:
        </p>
        <ul>
          <li>Supabase: banco de dados e autenticação;</li>
          <li>Vercel: hospedagem da aplicação;</li>
          <li>
            provedores de pagamento e de envio de e-mail, quando passarem a ser
            utilizados (esta lista será atualizada);
          </li>
          <li>
            autoridades públicas, quando houver obrigação legal ou ordem
            judicial.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Transferência internacional">
        <p>
          Os dados ficam em servidores localizados em {LEGAL.regiaoServidores},
          e provedores de infraestrutura podem processar dados fora do Brasil.
          Quando isso ocorrer, adotamos as garantias previstas na LGPD, como
          cláusulas contratuais adequadas ou provedores que mantêm padrão de
          proteção compatível.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Acesso de suporte e controle de acesso">
        <p>
          Dentro de cada empresa, o acesso depende do papel do usuário:
          funcionários veem apenas agendamentos e relatórios, enquanto
          financeiro, estoque, equipe e auditoria ficam restritos a
          administradores. Os dados de uma empresa são isolados dos de outras
          empresas no banco de dados.
        </p>
        <p>
          Nossa equipe autorizada pode acessar uma conta em modo de suporte,
          somente para atendimento e segurança. O início e o fim dessas sessões
          ficam registrados na auditoria da empresa.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Por quanto tempo guardamos">
        <ul>
          <li>Enquanto a conta estiver ativa, para prestar o serviço.</li>
          <li>
            Após o cancelamento: {LEGAL.diasExportacao} dias para exportação e
            exclusão ou anonimização em até {LEGAL.diasExclusao} dias.
          </li>
          <li>
            Registros que a lei exija guardar (por exemplo, fiscais e de
            segurança) podem ser mantidos pelo prazo legal.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={8} title="Seus direitos">
        <p>Conforme a LGPD, o titular pode solicitar, a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>
            anonimização, bloqueio ou eliminação de dados desnecessários ou
            tratados em desconformidade;
          </li>
          <li>portabilidade dos dados, quando aplicável;</li>
          <li>informação sobre com quem compartilhamos seus dados;</li>
          <li>
            revogação do consentimento, quando essa for a base legal utilizada.
          </li>
        </ul>
        <p>
          Para exercer esses direitos, escreva para {LEGAL.emailPrivacidade}. Se
          você é Cliente Final de uma barbearia ou salão, o pedido sobre os
          dados do seu atendimento deve ser dirigido primeiro à empresa que o
          atendeu, que é a controladora; nós ajudamos a empresa a atender o
          pedido. Você também pode reclamar à Autoridade Nacional de Proteção de
          Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection n={9} title="Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais como conexão criptografada
          (HTTPS), isolamento dos dados por empresa, controle de acesso por
          papel, trilha de auditoria e alertas de eventos sensíveis. Nenhum
          sistema é totalmente imune a falhas. Em caso de incidente que possa
          causar risco ou dano relevante, comunicaremos os afetados e a ANPD nos
          termos da lei.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Cookies">
        <p>
          Usamos apenas cookies essenciais para manter você conectado e, no caso
          do modo de suporte, para identificar a sessão de atendimento.
          Atualmente não usamos cookies de publicidade nem de análise de
          audiência. Se isso mudar, atualizaremos esta Política e, quando
          necessário, pediremos seu consentimento.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Crianças e adolescentes">
        <p>
          A Plataforma é destinada a empresas e seus colaboradores adultos. Se o
          Cliente cadastrar dados de menores de 18 anos como Clientes Finais, é
          dele a responsabilidade de obter o consentimento específico de pelo
          menos um dos pais ou responsável legal, conforme o art. 14 da LGPD.
        </p>
      </LegalSection>

      <LegalSection n={12} title="Alterações desta política">
        <p>
          Podemos atualizar esta Política. A versão vigente e a data de início
          estão sempre indicadas no topo desta página. Mudanças relevantes serão
          avisadas pelo painel ou por e-mail.
        </p>
      </LegalSection>

      <LegalSection n={13} title="Contato">
        <p>
          Assuntos de privacidade e proteção de dados: {LEGAL.emailPrivacidade}.
          Suporte geral: {LEGAL.emailSuporte}.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

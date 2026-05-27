---
title: "Colorful Minors 1"
publishedAt: 2026-05-21T22:35:00+09:00
updatedAt: 2026-05-27T18:47:00+09:00
category: "Paper Reading"
lensScopes:
  - colorful-minors
layout: ../../layouts/PostLayout.astro
---

이 글은 Protopapas, Thilikos & Wiederrecht의 논문 [Colorful Minors](https://arxiv.org/abs/2507.10467v3)를 읽으며 정리하는 글이다. 독자를 위한 설명보다는 필자의 생각을 글로 작성하는 것을 목적으로 하며, 잘못된 이해로 인한 틀린 서술이 있을 수 있다.

## Introduction

### 1.1 Our results

Multi-annotated graphs는 문제에서 그래프의 특정 부분을 따로 표시해서 주는 상황을 의미하는 것 같다. 이런 상황을 generalize하기 위해 colorful graph라는 개념을 도입한 것이 이 논문의 큰 줄기로 보인다. 영어 읽기는 어려우니 자세한 설명은 넘어가고 formal part를 읽자.

<!-- lens: colorful graph, restricted, empty, rainbow -->
$q$를 음이 아닌 정수라 하자. **$q$-colorful graph**는 그래프 $G$와 $V(G) \to 2^{[q]}$인 map $\chi$의 pair다. $\chi(v)$를 $v$의 palette라고 하자. $\chi(X) = \bigcup_{v \in X} \chi(v), \chi(G) = \chi(V(G)), \chi^{-1}(I) = \{v \in V(G): I \cap \chi(v) \neq \emptyset\}, \chi^{-1}(i) = \chi^{-1}(\{i\})$ 등의 notation도 사용한다.

$\chi(G)$가 $[q]$가 아닌, 즉 어떤 색이 아예 없는 그래프를 **restricted**라 하고, $\chi(G)$가 empty set인 그래프를 **empty**라고 하자. 반대로 모든 정점 $v$에 대해 $\chi(v)$가 $[q]$인 그래프를 **rainbow**라 하자.
<!-- /lens -->

<!-- lens: colorful subgraph, colorful minor -->
Colorful graph끼리의 subgraph 관계는 기존 subgraph 관계에서 대응되었던 정점 간의 palette도 subset 관계를 이룸을 의미한다. Minor의 경우는 branch set의 color를 합집합하여 생각하면 된다. 엄밀하게는, 아래 4가지 연산으로 만들어지는 그래프를 colorful graph의 minor라고 한다.

1. 정점 제거 (이때 $\chi$의 정의역에서 해당 정점을 제거한다는 등의 디테일이 필요하지만 앞으로도 이런 디테일은 생략한다)
2. 간선 제거
3. 정점의 palette에서 color 제거
4. edge를 contract하면서 palette를 union
<!-- /lens -->

아래 Theorem 1.1은 이 논문의 results 중 하나이며 Section 2.4에서 증명할 예정이라고 한다.

<!-- lens: Theorem 1.1 -->
**Theorem 1.1.** $q$-colorful graph의 Class는 colorful minor relation에 대해 well-quasi-ordered이다.
<!-- /lens -->

<!-- lens: well-quasi-ordered, wqo -->
Well-quasi-ordered란 class의 원소를 어떤 방법으로든 무한히 나열해 $a_1, a_2, \ldots$를 만들면, $a_i \leq a_j$인 $i<j$가 존재한다는 성질을 의미한다. 위 theorem에서는 $(H, \psi)$가 $(G, \chi)$의 colorful minor일 때 $(H, \psi) \leq (G, \chi)$라고 보고 이해하면 된다.
<!-- /lens -->

<!-- lens: torso, mathsf torso -->
또 세 가지 structure theorem이 있다고 한다. 첫 번째는 rainbow clique minor를 exclude하는 것에 대한 것으로, 우선 몇 가지를 정의하자. 정점 집합 $X$에 대해 $X$의 **torso**는 $X$ 외부의 정점을 전부 없애고 연결성을 $X$ 내부의 간선으로 표현한 그래프이다. 즉, $G-X$의 한 connected component $C$에 대해 $N(C) \cap X$를 clique으로 만들고 $C$를 삭제한 그래프라고 볼 수 있다. 이를 $\mathsf{torso}(G, X)$라고 하자. 이때 아래 theorem이 성립한다고 한다.
<!-- /lens -->

<!-- lens: Theorem 1.2, rainbow clique minor, restricted component -->
**Theorem 1.2.** 다항 함수 $rc: \mathbb{N}^2 \to \mathbb{N}$이 존재하여 모든 음이 아닌 정수 $q, t$와 $q$-colorful graph $(G, \chi)$에 대해 아래 중 하나가 성립한다.

1. $(G, \chi)$가 크기 $t$의 rainbow clique을 colorful minor로 가진다.
2. 정점 집합 $X$가 존재하여 $\mathsf{torso}(G, X)$가 $K_{rc(q, t)}$를 minor로 가지지 않으며 $G-X$의 모든 connected component는 restricted이다.

또한 위 두 구조 중 하나를 $2^{\text{poly}(qt)} \cdot V^3E \log V$ 시간에 찾을 수 있다(앞으로도 맥락에 헷갈림이 없는 선에서 그래프는 $G$, 정점의 개수는 $V$, 간선의 개수는 $E$라고 쓰자).
<!-- /lens -->

직관적으로 말하자면, colorful graph가 크기 $t$의 rainbow clique을 colorful minor로 가지지 않는데 큰 clique을 minor로 가지려면 사실 대부분은 restricted인 부분 덕분이고, 이를 빼고 나면 제한된 크기의 clique만을 minor로 가질 수 있다는 뜻으로 보인다. 물론 아직 바로 이해가 되지는 않기에 해당 chapter에서 더 알아보도록 하자.

<!-- lens: bags, adhesion, tw(G) -->
Theorem 1.3은 tree decomposition이 등장하는데, 정의에 대해서는 [https://octane-kr.github.io/posts/tree-decomposition/](https://octane-kr.github.io/posts/tree-decomposition/)을 참고하도록 하자. 이 논문에서는 tree decomposition을 $\mathcal{T} = (T, \beta)$로 쓴다. $\beta$는 $\mathcal{T}$의 **bags**라고 하고, $\mathcal{T}$의 **adhesion**을 $\max_{uv \in E(T)} |\beta(u) \cap \beta(v)|$로 정의한다. Treewidth는 $\mathsf{tw}(G)$로 표현한다.
<!-- /lens -->

<!-- lens: (q, k)-segregated grid, realize -->
또 하나 정의하고 가야 하는 것으로 $(q, k)$**-segregated grid**가 있다. 우선 $G$을 $(qk \times qk)$-grid라 하자. $(n \times m)$-grid는 그냥 가로줄 $n$개 세로줄 $m$개를 그어 만들어진 격자 형태의 그래프를 의미한다. 물론 각 격자점이 vertex가 된다. 이제 1번째 열을 제외한 정점들의 palette를 $\emptyset$으로 정하자. 첫 번째 열에는 $qk$개의 정점이 남는데, 연속한 $k$개씩을 묶어 한 색으로 칠하자(크기 1의 palette를 부여하자). 이때 다른 묶음을 다른 색으로 칠한 것을 $(q, k)$-segregated grid라고 한다. 즉, $(q, k)$-segregated grid $(G, \chi)$가 하나 주어지면 자연스럽게 이에 대응되는 $\{1, \ldots, q\}$의 permutation $\pi$를 얻는다. 이때 $(G, \chi)$는 $\pi$를 **realize**한다고 표현한다(정확히는 위아래를 뒤집어서 보면 뒤집은 permutation이 나오기 때문에 '대응'이라고 표현하기 살짝 애매하나 넘어가도록 하자).
<!-- /lens -->

<!-- lens: torso treewidth -->
잠시 Theorem 1.2를 recall하자. 어떤 colorful graph든 이를 colorful minor로 가지는 충분한 크기의 rainbow clique이 존재하므로, $(H, \psi)$-colorful minor-free 그래프는 $H'$-minor-free인 subgraph 하나와 restricted graphs들로 분해할 수 있다. 이런 관점에서 colorful graph의 **torso treewidth**를 정의하는데, $G-X$의 component가 전부 restricted graph인 $X$에 대해 $\mathsf{torso}(G, X)$의 treewidth를 구한 것의 최솟값이다. 대충 restricted part 때문에 생기는 treewidth를 배제하고 싶어서 만든 정의로 보이는데, 아직 와닿지 않으니 계속 읽어보도록 하자.
<!-- /lens -->

<!-- lens: Theorem 1.3 -->
**Theorem 1.3.** 함수 $sg: \mathbb{N}^2 \to \mathbb{N}$이 존재하여 모든 양의 정수 $q$, 음이 아닌 정수 $k$와 $q$-colorful graph $(G, \chi)$에 대해 아래 중 하나가 성립한다.

1. $(G, \chi)$의 torso treewidth가 $sg(q, k)$ 이하이다.
2. $(G, \chi)$가 어떤 $(q, k)$-segregated grid를 colorful minor로 가지며 $(G, \chi)$의 torso treewidth가 $k$ 이상이다.

이때 $sg(q, k)$는 $k^{2^{O(q)}}$ 스케일이며 위 두 구조 중 하나를 $2^{k^{2^{O(q)}}} \cdot V^3E\log V$ 시간에 찾을 수 있다.
<!-- /lens -->

즉, torso treewidth가 충분히 크면 $(q, k)$-segregated grid를 colorful minor로 가진다는 뜻이며 이는 minor에서 유명한 grid minor theorem과도 닮아 있는 것 같다. $(G, \chi)$의 torso treewidth가 $k-1$보다 크다는 파트는 아마 $(q, k)$-segregated grid가 존재한다는 사실에서 바로 얻어지는 부수적인 내용 같다(라고 쓰고 보니 실제로 아래 문단이 비슷한 이야기를 하고 있다).

<!-- lens: k-near embedding, apex set, vortex, interior, path decomposition -->
마지막으로 Theorem 1.4가 남았는데, 몇 가지를 더 정의하고 시작한다. 왜 기하 느낌이 나는지는 모르겠지만 읽어보자. 그래프 $G$가 surface $\Sigma$에 $k$**-near embedding**을 가진다는 것은 크기가 $k$ 이하인 정점 집합 $A$가 존재하여 아래 구조를 만족하는 $G-A = G_0 \cup \cdots \cup G_l$이 존재함을 의미한다. 필자는 일단 $\Sigma$가 직관적인 2차원 평면이라고 생각하고 이해해보고 있다.

1. $G_0$는 $\Sigma$ 위의 embedding이 존재하는 그래프이다. Embedding을 고정한 상태로, vertex-disjoint한 face $l$개를 뽑아서 $F_1, \ldots, F_l$이라고 하자. 방이 많은 벌집을 생각하면 된다. 물론 $F_i$들은 cycle이다.
2. $F_i$마다 $V(G_0) \cap V(G_i) = V(F_i)$인 그래프 $G_i$를 잡을 것이다. 서로 다른 $G_i$끼리는 역시 vertex-disjoint이다. 벌집의 방마다 애벌레가 들어가 있다고 생각하자. $G_i$는 애벌레가 아니라 방+애벌레임에 주의하자.
3. $G_i$는 width $k$ 이하의 path decomposition을 가진다. Path decomposition이란 tree decomposition 중 대응되는 tree가 path인 것을 의미한다. 더 나아가, 해당 path는 $F_i$를 cyclic하게 한 번 훑은 것과 자연스럽게 대응된다. Formal하게 말하면 $G_i$는 width가 $k$ 이하인 path decomposition $(P_i, \beta_i)$를 가지며 $P_i$는 $F_i$에서 간선을 하나 제거한 그래프이다. 이때, 모든 $v \in V(F_i) = V(P_i)$에 대해 $v \in \beta_i(v)$가 성립한다. 이것이 굳이 벌이 아니라 애벌레로 비유를 한 이유이다. 최대 $k$만큼 통통한 애벌레가 벽을 따라 둥글게 말려 있다고 보면 된다.

명칭이 $k$-near인 이유는 작은 $A$를 빼고 위와 같은 구조를 찾을 수 있기 때문으로 보인다. 아직 위 구조가 왜 좋은지는 모르겠으나 넘어가자. 참고로 $A$는 **apex set**, $G_i$는 **vortex**, $V(G_i) \setminus V(F_i)$는 **interior**라고 부른다.
<!-- /lens -->

<!-- lens: colorful torso -->
이번에는 **colorful torso**를 정의해보자. Torso와 달리 colorful torso는 $q$-colorful graph $(G, \chi)$와 $G$의 tree decomposition $(T, \beta)$까지 주어질 때 node $t \in V(T)$에 대해 정의한다. $t$와 인접한 node $a$에 대해 $T_a$를 $T-ta$의 두 connected component 중 $a$를 포함하는 쪽이라고 정의하자. $t$에서의 colorful torso는 일반 torso와 비슷하게 $(G[\beta(t)], \chi)$를 기반으로 외부 정점의 정보를 추가하는 방식으로 정의된다. 구체적으로, $t$와 인접한 node $a$를 하나 잡자. 이때 $\beta(t) \cap \beta(a)$를 우선 clique으로 만들고, 모든 $v \in \beta(t) \cap \beta(a)$의 palette에 $\chi( \bigcup _{b \in V(T_a)}(\beta(b) \setminus \beta(t)))$를 union해버리자. 식이 복잡해 보이지만 torso의 정의를 알 때 colorful torso를 상상할 수 있는 가장 자연스러운 방식을 서술했을 뿐이다. 왜 임의의 $X$가 아니라 $\chi(t)$에 대해 정의하는지는 이후 알게 될 것 같다.
<!-- /lens -->

<!-- lens: Theorem 1.4 -->
**Theorem 1.4.** 함수 $rg: \mathbb{N}^2 \to \mathbb{N}$이 존재하여 모든 음이 아닌 정수 $q, k$와 $q$-colorful graph $(G, \chi)$에 대해 아래 중 하나가 성립한다. 

1. $(G, \chi)$가 rainbow $(k \times k)$-grid를 colorful minor로 가진다.
2. $(G, \chi)$의 tree decomposition $(T, \beta)$가 존재하여 adhesion이 $rg(q, k)$ 이하이고 모든 node $t$에 대해 아래 중 하나가 성립한다.
   - $t$가 leaf이고 $t$의 유일한 neighbor $a$에 대해 $(G[\beta(t) \setminus \beta(a)], \chi)$가 restricted이다.
   - $t$에서의 colorful torso $(G_t, \chi_t)$가 $rg(q, k)$-near embedding을 가지고, empty set이 아닌 $I_t \subseteq \{1, \ldots, q\}$가 존재해 $I_t \cap \chi_t(v) \neq \emptyset$인 $v \in \beta(t)$는 모두 apex set에 들어가거나 어떤 vortex의 interior에 들어간다. 논문에는 $\Sigma$에 대한 언급이 없는데, 아마 2차원 평면이 아닐까 싶다.

이때 $rg(q, k)$는 $2^{k^{O(1)} 2^{2^{O(q)}}}$ 스케일이며 위 두 구조 중 하나를 $2^{2^{k^{O(1)} 2^{2^{O(q)}}}} \cdot V^3E \log V$ 시간에 찾을 수 있다.
<!-- /lens -->

사실 Theorem 1.4는 아직 직관적으로 이해하기 어려운 것 같다. Introduction에 theorem이 9개나 있는데 벌써 이러면 뒤가 걱정된다. 이 논문을 읽기 시작한 이유가 지도교수님(이자 이 논문의 저자)께서 석사과정 프로젝트에 도움이 될 것이라고 추천하셔서였는데, 아마 관련 있을 것 같은 부분이 Theorem 1.5로 추측되고 이후 내용은 다른 부분 같으니 introduction에서도 거기까지만 읽어야겠다. 2탄에서 이어가자.

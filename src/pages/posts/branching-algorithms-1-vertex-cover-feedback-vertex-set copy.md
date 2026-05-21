---
title: "Colorful Minors 1 (Incomplete)"
date: 2026-05-21
publishedAt: 2026-05-21T22:35:00+09:00
updatedAt: 2026-05-21T22:35:00+09:00
category: "Paper Reading"
layout: ../../layouts/PostLayout.astro
---

이 글은 Protopapas, Thilikos & Wiederrecht의 논문 [Colorful Minors](https://arxiv.org/abs/2507.10467v3)를 읽으며 정리하는 글이다. 독자를 위한 설명보다는 필자의 생각을 글로 작성하는 것을 목적으로 하며, 잘못된 이해로 인한 틀린 서술이 있을 수 있다.

## Introduction

### 1.1 Our results

Multi-annotated graphs는 문제에서 그래프의 특정 부분을 따로 표시해서 주는 상황을 의미하는 것 같다. 이런 상황을 generalize하기 위해 colorful graph라는 개념을 도입한 것이 이 논문의 큰 줄기로 보인다. 영어 읽기는 어려우니 자세한 설명은 넘어가고 formal part를 읽자.

**Colorful graphs.**

$q$를 음이 아닌 정수라 하자. **$q$-colorful graph**는 그래프 $G$와 $V(G) \to 2^{[q]}$인 map $\chi$의 pair다. $\chi(v)$를 $v$의 palette라고 하자. $\chi(X) = \bigcup_{v \in X} \chi(v), \chi(G) = \chi(V(G)), \chi^{-1}(I) = \{v \in V(G): I \cap \chi(v) \neq \emptyset\}, \chi^{-1}(i) = \chi^{-1}(\{i\})$ 등의 notation도 사용한다.

$\chi(G)$가 $[q]$가 아닌, 즉 어떤 색이 아예 없는 그래프를 **restricted**라 하고, $\chi(G)$가 empty set인 그래프를 **empty**라고 하자. 반대로 모든 정점 $v$에 대해 $\chi(v)$가 $[q]$인 그래프를 **rainbow**라 하자.

Colorful graph끼리의 subgraph 관계는 기존 subgraph 관계에서 대응되었던 정점 간의 palette도 subset 관계를 이룸을 의미한다. Minor의 경우는 branch set의 color를 합집합하여 생각하면 된다. 엄밀하게는, 아래 4가지 연산으로 만들어지는 그래프를 colorful graph의 minor라고 한다.

1. 정점 제거 (이때 $\chi$의 정의역에서 해당 정점을 제거한다는 등의 디테일이 필요하지만 앞으로도 이런 디테일은 생략한다)
2. 간선 제거
3. 정점의 palette에서 color 제거
4. edge를 contract하면서 palette를 union

아래 Theorem 1.1은 이 논문의 results 중 하나이며 Section 2.4에서 증명할 예정이라고 한다.

**Theorem 1.1.** $q$-colorful graph의 Class는 colorful minor relation에 대해 well-quasi-ordered이다.

또 세 가지 structure theorem이 있다고 한다. 첫 번째는 rainbow clique minor를 exclude하는 것에 대한 것으로, 우선 몇 가지를 정의하자. 정점 집합 $X$에 대해 $X$의 **torso**는 $X$ 외부의 정점을 전부 없애고 연결성을 $X$ 내부의 간선으로 표현한 그래프이다. 즉, $G-X$의 한 connected component $C$에 대해 $N(C) \cap X$를 clique으로 만들고 $C$를 삭제한 그래프라고 볼 수 있다. 이를 $\mathsf{torso}(G, X)$라고 하자. 이때 아래 theorem이 성립한다고 한다.

**Theorem 1.2.** 다항 함수 $rc: \mathbb{N}^2 \to \mathbb{N}$이 존재하여 모든 음이 아닌 정수 $q, t$와 $q$-colorful graph $(G, \chi)$에 대해 아래 중 하나가 성립한다.

1. $(G, \chi)$가 크기 $t$의 rainbow clique을 colorful minor로 가진다.
2. 정점 집합 $X$가 존재하여 $\mathsf{torso}(G, X)$가 $K_{rc(q, t)}$를 minor로 가지지 않으며 $G-X$의 모든 connected component는 restricted이다.

또한 위 두 구조 중 하나를 $2^{\text{poly}(qt)} \cdot V^3E \log V$ 시간에 찾을 수 있다(앞으로도 맥락에 헷갈림이 없는 선에서 그래프는 $G$, 정점의 개수는 V, 간선의 개수는 E라고 쓰자).

직관적으로 말하자면, colorful graph가 크기 $t$의 rainbow clique을 colorful minor로 가지지 않는데 큰 clique을 minor로 가지려면 사실 대부분은 restricted인 부분 덕분이고, 이를 빼고 나면 제한된 크기의 clique만을 minor로 가질 수 있다는 뜻으로 보인다. 물론 아직 바로 이해가 되지는 않기에 해당 chapter에서 더 알아보도록 하자.

Theorem 1.3은 treewidth가 등장하는데, 마침 관련된 글을 작성하고 싶었기에 우선 여기서 중단하고 곧 이어 써보도록 하겠다.
using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class DeathText : MonoBehaviour {

    [SerializeField]
    private Text _deathText;

    [SerializeField]
    private Color[] _colorText;

    /*
     * 0 = RED P1
     * 1 = BLUE P2
     * 2 = GREEN P3
     * 3 = YELLOW P4
     */

    [SerializeField]
    private List<string> _deathStrings;

    /*
  WeaponList:
      0 = Stone
      1 = Pill
      2 = Shuriken
      3 = Hadouken
      4 = Pizza
      5 = Barrel
      6 = Sock
      7 = Duck
      8 = Bomb
      9 = Music
  */

    void Awake()
    {
        PlayerDetectHit.OnStoneDeath += SetStoneText;
        PlayerDetectHit.OnPillDeath += SetPillText;
        PlayerDetectHit.OnShurikenDeath += SetShurikenText;

        PlayerDetectHit.OnHadoukenDeath += SetHadoukenText;
        PlayerDetectHit.OnPizzaDeath += SetPizzaText;
        PlayerDetectHit.OnBarrelDeath += SetBarrelText;

        PlayerDetectHit.OnSockDeath += SetSockText;
        PlayerDetectHit.OnDuckDeath += SetDuckText;
        PlayerDetectHit.OnBombDeath += SetBombText;

        PlayerDetectHit.OnMusicDeath += SetMusicText;

        PlayerDetectHit.AddP1Score += ColorP1Text;
        PlayerDetectHit.AddP2Score += ColorP2Text;
        PlayerDetectHit.AddP3Score += ColorP3Text;
        PlayerDetectHit.AddP4Score += ColorP4Text;

    }

    void SetStoneText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[0];
    }

    void SetPillText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[1];
    }

    void SetShurikenText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[2];
    }

    void SetHadoukenText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[3];
    }

    void SetPizzaText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[4];
    }

    void SetBarrelText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[5];
    }

    void SetSockText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[6];
    }

    void SetDuckText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[7];
    }


    void SetBombText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[8];
    }

    void SetMusicText(PlayerDetectHit player)
    {
        _deathText.text = _deathStrings[9];
    }

    /*
     * Decides which text pops up with each weapon.
     * Pops up whenever a player dies.
     */

    void ColorP1Text(PlayerDetectHit player)
    {
        _deathText.color = _colorText[0];
    }

    void ColorP2Text(PlayerDetectHit player)
    {
        _deathText.color = _colorText[1];
    }

    void ColorP3Text(PlayerDetectHit player)
    {
        _deathText.color = _colorText[2];
    }

    void ColorP4Text(PlayerDetectHit player)
    {
        _deathText.color = _colorText[3];
    }

    void OnDestroy()
    {
        PlayerDetectHit.OnStoneDeath -= SetStoneText;
        PlayerDetectHit.OnPillDeath -= SetPillText;
        PlayerDetectHit.OnShurikenDeath -= SetShurikenText;

        PlayerDetectHit.OnHadoukenDeath -= SetHadoukenText;
        PlayerDetectHit.OnPizzaDeath -= SetPizzaText;
        PlayerDetectHit.OnBarrelDeath -= SetBarrelText;

        PlayerDetectHit.OnSockDeath -= SetSockText;
        PlayerDetectHit.OnDuckDeath -= SetDuckText;
        PlayerDetectHit.OnBombDeath -= SetBombText;

        PlayerDetectHit.OnMusicDeath -= SetMusicText;

        PlayerDetectHit.AddP1Score -= ColorP1Text;
        PlayerDetectHit.AddP2Score -= ColorP2Text;
        PlayerDetectHit.AddP3Score -= ColorP3Text;
        PlayerDetectHit.AddP4Score -= ColorP4Text;
    }
}

using UnityEngine;
using UnityEngine.UI;
using System.Collections;
using System.Collections.Generic;

public class DeathText : MonoBehaviour {

    [SerializeField]
    private Text _deathText;

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
      8 = Bom
  */

    void Awake()
    {
        PlayerSendText.OnStoneDeath += SetStoneText;
        PlayerSendText.OnPillDeath += SetPillText;
        PlayerSendText.OnShurikenDeath += SetShurikenText;

        PlayerSendText.OnHadoukenDeath += SetHadoukenText;
        PlayerSendText.OnPizzaDeath += SetPizzaText;
        PlayerSendText.OnBarrelDeath += SetBarrelText;

        PlayerSendText.OnSockDeath += SetSockText;
        PlayerSendText.OnDuckDeath += SetDuckText;
        PlayerSendText.OnBombDeath += SetBombText;

    }

    void SetStoneText(PlayerSendText player)
    {
        _deathText.text = _deathStrings[0];
    }

    void SetPillText(PlayerSendText player)
    {
        _deathText.text = _deathStrings[1];
    }

    void SetShurikenText(PlayerSendText player)
    {
        _deathText.text = _deathStrings[2];
    }

    void SetHadoukenText(PlayerSendText player)
    {
        _deathText.text = _deathStrings[3];
    }

    void SetPizzaText(PlayerSendText player)
    {
        _deathText.text = _deathStrings[4];
    }

    void SetBarrelText(PlayerSendText player)
    {
        _deathText.text = _deathStrings[5];
    }

    void SetSockText(PlayerSendText player)
    {
        _deathText.text = _deathStrings[6];
    }

    void SetDuckText(PlayerSendText player)
    {
        _deathText.text = _deathStrings[7];
    }

    
    void SetBombText(PlayerSendText player)
    {
        _deathText.text = _deathStrings[8];
    }
    
}

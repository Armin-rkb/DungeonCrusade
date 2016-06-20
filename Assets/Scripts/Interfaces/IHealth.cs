using UnityEngine;
using UnityEngine.EventSystems;
using System.Collections;

public interface IHealth: IEventSystemHandler
{
    void ChangeHealth(int damage, bool hurt);
}

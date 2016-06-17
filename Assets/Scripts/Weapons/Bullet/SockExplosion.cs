using UnityEngine;
using System.Collections;

public class SockExplosion : MonoBehaviour
{
    //Amout of damage that the bullet will deal
    [SerializeField] private int damage;
    //Amount of Knockback the bullet will give
    [SerializeField] private float knockback;

    public int playernum;

    void Start()
    {
        ExplosionSound();
    }

    void ExplosionSound()
    {
        SoundManager.PlayAudioClip(AudioData.DuckExplosion);
    }

    void Hit(GameObject player)
    {
        //Give the player knockback
        PlayerMovement playerMovement = player.GetComponent<PlayerMovement>();
        Rigidbody2D rbPlayer = player.GetComponent<Rigidbody2D>();
        Vector2 currPosition = (transform.position - rbPlayer.transform.position).normalized;
        playerMovement.ApplyKnockback(currPosition * knockback);
        //Finds the health script of the hit player 
        HealthPlayer healthPlayer = player.GetComponent<HealthPlayer>();
        healthPlayer.ChangeHealth(damage, true);
        //IgnorePlayerHit
        Physics2D.IgnoreCollision(player.GetComponent<Collider2D>(), GetComponent<Collider2D>());
    }

    void OnParticleCollision(GameObject other)
    {
        if (other != null)
        {
            if (other.CompareTag(GameTags.player))
                Hit(other);
        }
    }
}
